import base64
import json
import unittest
from datetime import datetime, timezone

from app.agents.document_template import render_document


class DocumentTemplateTests(unittest.TestCase):
    def test_structured_content_generates_pdf_by_default(self):
        raw = json.dumps({
            "title": "Plano de ação",
            "summary": "Objetivo principal.",
            "sections": [
                {"heading": "Etapas", "paragraphs": ["Conteúdo completo."], "items": ["Revisar", "Aprovar"]}
            ],
            "conclusion": "Próximo passo."
        })
        result = render_document(raw, ["manual.md", "manual.md"], generated_at=datetime(2026, 9, 29, tzinfo=timezone.utc))
        self.assertEqual(result["name"], "plano-de-acao-20260929-000000.pdf")
        self.assertEqual(result["mime_type"], "application/pdf")
        self.assertEqual(result["format"], "pdf")

        pdf_bytes = base64.b64decode(result["content"])
        self.assertTrue(pdf_bytes.startswith(b"%PDF-"))

        self.assertIn("# Plano de ação", result["markdown"])
        self.assertIn("## Resumo", result["markdown"])
        self.assertIn("## Etapas", result["markdown"])
        self.assertEqual(result["markdown"].count("- manual.md"), 1)

    def test_docx_generation(self):
        raw = json.dumps({
            "title": "Minuta de Contrato",
            "summary": "Resumo contratual.",
            "sections": [
                {"heading": "Cláusula 1", "paragraphs": ["Termos da prestação."], "items": ["Item A", "Item B"]}
            ],
            "conclusion": "Disposições finais."
        })
        result = render_document(raw, ["politica.docx"], generated_at=datetime(2026, 9, 29, tzinfo=timezone.utc), file_format="docx")
        self.assertEqual(result["name"], "minuta-de-contrato-20260929-000000.docx")
        self.assertEqual(result["mime_type"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        self.assertEqual(result["format"], "docx")
        docx_bytes = base64.b64decode(result["content"])
        # DOCX files are zip archives starting with PK
        self.assertTrue(docx_bytes.startswith(b"PK"))

    def test_xlsx_generation(self):
        raw = json.dumps({
            "title": "Balanço Operacional",
            "summary": "Demonstrativo trimestral.",
            "sections": [
                {"heading": "Métricas", "paragraphs": ["Indicadores de eficiência."], "items": ["SLA: 99.8%", "Uptime: 99.9%"]}
            ],
            "conclusion": "Metas alcançadas."
        })
        result = render_document(raw, [], generated_at=datetime(2026, 9, 29, tzinfo=timezone.utc), file_format="xlsx")
        self.assertEqual(result["name"], "balanco-operacional-20260929-000000.xlsx")
        self.assertEqual(result["mime_type"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        self.assertEqual(result["format"], "xlsx")
        xlsx_bytes = base64.b64decode(result["content"])
        self.assertTrue(xlsx_bytes.startswith(b"PK"))

    def test_pptx_generation(self):
        raw = json.dumps({
            "title": "Apresentação Estratégica",
            "summary": "Visão geral de negócios.",
            "sections": [
                {"heading": "Resultados Q3", "paragraphs": ["Crescimento consistente."], "items": ["Novos clientes", "Expansão"]}
            ],
            "conclusion": "Próximos objetivos."
        })
        result = render_document(raw, ["manual.pdf"], generated_at=datetime(2026, 9, 29, tzinfo=timezone.utc), file_format="pptx")
        self.assertEqual(result["name"], "apresentacao-estrategica-20260929-000000.pptx")
        self.assertEqual(result["mime_type"], "application/vnd.openxmlformats-officedocument.presentationml.presentation")
        self.assertEqual(result["format"], "pptx")
        pptx_bytes = base64.b64decode(result["content"])
        self.assertTrue(pptx_bytes.startswith(b"PK"))

    def test_markdown_format_when_explicitly_requested(self):
        raw = json.dumps({"title": "Relatório Técnico", "sections": [{"heading": "Dados", "paragraphs": ["Linha 1"]}]})
        result = render_document(raw, ["manual.md"], generated_at=datetime(2026, 9, 29, tzinfo=timezone.utc), file_format="md")
        self.assertEqual(result["name"], "relatorio-tecnico-20260929-000000.md")
        self.assertEqual(result["mime_type"], "text/markdown")
        self.assertEqual(result["format"], "md")
        self.assertIn("# Relatório Técnico", result["content"])

    def test_plain_output_generates_pdf_and_plain_markdown(self):
        result = render_document("Texto livre\n# Cabeçalho inesperado", [])
        self.assertTrue(result["name"].endswith(".pdf"))
        self.assertEqual(result["mime_type"], "application/pdf")
        pdf_bytes = base64.b64decode(result["content"])
        self.assertTrue(pdf_bytes.startswith(b"%PDF-"))
        self.assertIn("Texto livre\n\\# Cabeçalho inesperado", result["markdown"])
        self.assertIn("Nenhuma fonte documental consultada.", result["markdown"])

    def test_fenced_json_and_invalid_fields(self):
        result = render_document('```json\n{"title":"../../Plano","sections":[null,{"paragraphs":[42,"Corpo"]}]}\n```', [])
        self.assertTrue(result["name"].startswith("plano-"))
        self.assertTrue(result["name"].endswith(".pdf"))
        self.assertIn("Corpo", result["markdown"])
        self.assertNotIn("```", result["markdown"])

    def test_empty_response_does_not_generate_file(self):
        with self.assertRaises(ValueError):
            render_document("  ", [])


if __name__ == "__main__":
    unittest.main()
