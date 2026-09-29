"""Standard document layout and multi-format exporters (PDF, DOCX, XLSX, PPTX, MD)."""

import base64
import html
import io
import json
import logging
import re
import unicodedata
from datetime import datetime, timezone

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False

try:
    import docx
    from docx.shared import Pt as DocxPt, RGBColor as DocxRGBColor
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

try:
    import openpyxl
    from openpyxl.styles import Font as XlsxFont, PatternFill, Alignment, Border, Side
    HAS_OPENPYXL = True
except ImportError:
    HAS_OPENPYXL = False

try:
    from pptx import Presentation
    from pptx.util import Inches, Pt as PptxPt
    from pptx.dml.color import RGBColor as PptxRGBColor
    HAS_PPTX = True
except ImportError:
    HAS_PPTX = False

logger = logging.getLogger("omnichannel-ai.document_template")

DOCUMENT_CONTENT_INSTRUCTIONS = """
O arquivo recebe automaticamente a identidade visual corporativa da Omnichannel (PDF por padrão, ou DOCX, XLSX, PPTX conforme solicitado).
Produza apenas um objeto JSON com conteúdo textual, sem cercas de código:
{"title":"Título curto", "summary":"Resumo opcional", "sections":[
  {"heading":"Nome da seção", "paragraphs":["Parágrafo"], "items":["Item opcional"]}
], "conclusion":"Conclusão opcional"}
Use strings de texto simples, sem Markdown ou HTML complexo. Escolha as seções conforme
o documento solicitado. Não escreva nome de arquivo, data, cabeçalho institucional,
fontes, instruções de download ou comentários sobre a geração: a aplicação inclui
esses elementos e compila o arquivo para download do usuário. Não invente dados para preencher campos; omita campos opcionais
sem conteúdo. O conteúdo deve responder com completude e precisão técnica à solicitação do usuário.
"""


def _text(value):
    return value.strip() if isinstance(value, str) else ""


def _plain(value):
    """Keep model text and source names from changing the Markdown layout."""
    return re.sub(r"([\\`*_{}\[\]<>#!|])", r"\\\1", _text(value))


def _line(value):
    return " ".join(_plain(value).split())


def _escape_xml(value: str) -> str:
    escaped = html.escape(_text(value))
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", escaped)
    escaped = re.sub(r"\*(.+?)\*", r"<i>\1</i>", escaped)
    escaped = escaped.replace("\n", "<br/>")
    return escaped


def build_pdf_bytes(title: str, summary: str, sections: list, conclusion: str, sources: list, timestamp: datetime) -> bytes:
    """Gera o binário de um PDF corporativo estilizado da Omnichannel."""
    if not HAS_REPORTLAB:
        raise RuntimeError("Biblioteca reportlab não encontrada para geração de PDF.")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=45,
    )

    styles = getSampleStyleSheet()

    sub_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=4,
    )
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Title'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0F172A'),
        alignment=0,
        spaceAfter=6,
    )
    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=8,
    )
    h2_style = ParagraphStyle(
        'DocH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=12,
        spaceAfter=5,
        keepWithNext=True,
    )
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6,
    )
    summary_box_style = ParagraphStyle(
        'DocSummary',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=6,
    )
    bullet_style = ParagraphStyle(
        'DocBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor('#334155'),
        leftIndent=14,
        spaceAfter=3,
    )

    time_str = timestamp.strftime('%d/%m/%Y às %H:%M UTC')
    story = [
        Paragraph('OMNICHANNEL PLATFORM &middot; DOCUMENTO CORPORATIVO', sub_style),
        Paragraph(_escape_xml(title), title_style),
        Paragraph('<b>Gerado em:</b> ' + time_str + ' &nbsp;|&nbsp; <b>Status:</b> Oficial', meta_style),
        HRFlowable(width='100%', thickness=1, color=colors.HexColor('#E2E8F0'), spaceBefore=4, spaceAfter=10),
    ]

    if summary:
        story.append(Paragraph('Resumo Executivo', h2_style))
        story.append(Paragraph(_escape_xml(summary), summary_box_style))
        story.append(Spacer(1, 4))

    for sec in sections:
        h = sec.get('heading')
        if h:
            story.append(Paragraph(_escape_xml(h), h2_style))
        for p in sec.get('paragraphs', []):
            if p:
                story.append(Paragraph(_escape_xml(p), body_style))
        for item in sec.get('items', []):
            if item:
                story.append(Paragraph('&bull; &nbsp; ' + _escape_xml(item), bullet_style))
        story.append(Spacer(1, 4))

    if conclusion:
        story.append(Paragraph('Conclusão', h2_style))
        story.append(Paragraph(_escape_xml(conclusion), body_style))
        story.append(Spacer(1, 4))

    story.append(HRFlowable(width='100%', thickness=0.8, color=colors.HexColor('#E2E8F0'), spaceBefore=8, spaceAfter=8))
    story.append(Paragraph('Fontes Consultadas', h2_style))
    if sources:
        for s in sources:
            story.append(Paragraph('&bull; &nbsp; ' + _escape_xml(s), bullet_style))
    else:
        story.append(Paragraph('Nenhuma fonte documental consultada.', body_style))

    def on_page(canvas, d):
        canvas.saveState()
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.HexColor('#94A3B8'))
        canvas.drawString(40, 22, 'OMNICHANNEL PLATFORM - Documento Corporativo Confidencial')
        canvas.drawRightString(d.pagesize[0] - 40, 22, 'Página ' + str(canvas.getPageNumber()))
        canvas.restoreState()

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    return buffer.getvalue()


def build_docx_bytes(title: str, summary: str, sections: list, conclusion: str, sources: list, timestamp: datetime) -> bytes:
    """Gera o binário de um documento Word (.docx) corporativo estilizado da Omnichannel."""
    if not HAS_DOCX:
        raise RuntimeError("Biblioteca python-docx não encontrada para geração de DOCX.")

    doc = docx.Document()

    # Subtitle / Header
    p_header = doc.add_paragraph()
    r_header = p_header.add_run("OMNICHANNEL PLATFORM · DOCUMENTO CORPORATIVO")
    r_header.font.size = DocxPt(8.5)
    r_header.font.bold = True
    r_header.font.color.rgb = DocxRGBColor(100, 116, 139)
    p_header.paragraph_format.space_after = DocxPt(2)

    # Title
    p_title = doc.add_paragraph()
    r_title = p_title.add_run(title)
    r_title.font.size = DocxPt(20)
    r_title.font.bold = True
    r_title.font.color.rgb = DocxRGBColor(15, 23, 42)
    p_title.paragraph_format.space_after = DocxPt(4)

    # Meta
    p_meta = doc.add_paragraph()
    time_str = timestamp.strftime('%d/%m/%Y às %H:%M UTC')
    r_meta = p_meta.add_run(f"Gerado em: {time_str} | Status: Oficial")
    r_meta.font.size = DocxPt(9)
    r_meta.font.italic = True
    r_meta.font.color.rgb = DocxRGBColor(100, 116, 139)
    p_meta.paragraph_format.space_after = DocxPt(14)

    # Summary
    if summary:
        h_sum = doc.add_heading(level=2)
        r_sum = h_sum.add_run("Resumo Executivo")
        r_sum.font.color.rgb = DocxRGBColor(15, 23, 42)
        p_sum = doc.add_paragraph(summary)
        p_sum.paragraph_format.space_after = DocxPt(10)

    # Sections
    for sec in sections:
        h = sec.get("heading")
        if h:
            h_sec = doc.add_heading(level=2)
            r_sec = h_sec.add_run(h)
            r_sec.font.color.rgb = DocxRGBColor(15, 23, 42)
        for p in sec.get("paragraphs", []):
            if p:
                doc.add_paragraph(p)
        for item in sec.get("items", []):
            if item:
                doc.add_paragraph(item, style='List Bullet')

    # Conclusion
    if conclusion:
        h_concl = doc.add_heading(level=2)
        r_concl = h_concl.add_run("Conclusão")
        r_concl.font.color.rgb = DocxRGBColor(15, 23, 42)
        doc.add_paragraph(conclusion)

    # Sources
    h_src = doc.add_heading(level=2)
    r_src = h_src.add_run("Fontes Consultadas")
    r_src.font.color.rgb = DocxRGBColor(15, 23, 42)
    if sources:
        for s in sources:
            doc.add_paragraph(s, style='List Bullet')
    else:
        doc.add_paragraph("Nenhuma fonte documental consultada.")

    buffer = io.BytesIO()
    doc.save(buffer)
    return buffer.getvalue()


def build_xlsx_bytes(title: str, summary: str, sections: list, conclusion: str, sources: list, timestamp: datetime) -> bytes:
    """Gera o binário de uma planilha Excel (.xlsx) estruturada com formatação corporativa."""
    if not HAS_OPENPYXL:
        raise RuntimeError("Biblioteca openpyxl não encontrada para geração de XLSX.")

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Relatório Corporativo"

    dark_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    table_header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")

    white_bold_14 = XlsxFont(name="Calibri", size=14, bold=True, color="FFFFFF")
    white_bold_11 = XlsxFont(name="Calibri", size=11, bold=True, color="FFFFFF")
    meta_font = XlsxFont(name="Calibri", size=9, italic=True, color="64748B")
    regular_font = XlsxFont(name="Calibri", size=10, color="1E293B")

    thin_border = Border(
        left=Side(style='thin', color="E2E8F0"),
        right=Side(style='thin', color="E2E8F0"),
        top=Side(style='thin', color="E2E8F0"),
        bottom=Side(style='thin', color="E2E8F0")
    )

    # Title Banner (merged A1:D1)
    ws.merge_cells("A1:D1")
    top_cell = ws["A1"]
    top_cell.value = f"OMNICHANNEL PLATFORM · {title.upper()}"
    top_cell.font = white_bold_14
    top_cell.fill = dark_fill
    top_cell.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[1].height = 36

    time_str = timestamp.strftime('%d/%m/%Y às %H:%M UTC')
    ws["A2"] = f"Gerado em: {time_str} | Status: Oficial"
    ws["A2"].font = meta_font
    ws.row_dimensions[2].height = 18

    current_row = 4
    headers = ["Seção / Módulo", "Elemento", "Conteúdo / Detalhamento", "Observações"]
    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(row=current_row, column=col_idx, value=h)
        cell.font = white_bold_11
        cell.fill = table_header_fill
        cell.alignment = Alignment(horizontal="left", vertical="center")
        cell.border = thin_border
    ws.row_dimensions[current_row].height = 24
    current_row += 1

    if summary:
        row_cells = [
            ws.cell(row=current_row, column=1, value="Resumo Executivo"),
            ws.cell(row=current_row, column=2, value="Síntese"),
            ws.cell(row=current_row, column=3, value=summary),
            ws.cell(row=current_row, column=4, value="Visão Geral"),
        ]
        for c in row_cells:
            c.font = regular_font
            c.border = thin_border
            c.alignment = Alignment(vertical="top", wrap_text=True)
        current_row += 1

    for sec in sections:
        h = sec.get("heading") or "Seção"
        for p in sec.get("paragraphs", []):
            if not p:
                continue
            row_cells = [
                ws.cell(row=current_row, column=1, value=h),
                ws.cell(row=current_row, column=2, value="Parágrafo"),
                ws.cell(row=current_row, column=3, value=p),
                ws.cell(row=current_row, column=4, value="Texto explicativo"),
            ]
            for c in row_cells:
                c.font = regular_font
                c.border = thin_border
                c.alignment = Alignment(vertical="top", wrap_text=True)
            current_row += 1
        for item in sec.get("items", []):
            if not item:
                continue
            row_cells = [
                ws.cell(row=current_row, column=1, value=h),
                ws.cell(row=current_row, column=2, value="Item / Requisito"),
                ws.cell(row=current_row, column=3, value=item),
                ws.cell(row=current_row, column=4, value="Tópico acionável"),
            ]
            for c in row_cells:
                c.font = regular_font
                c.border = thin_border
                c.alignment = Alignment(vertical="top", wrap_text=True)
            current_row += 1

    if conclusion:
        row_cells = [
            ws.cell(row=current_row, column=1, value="Conclusão"),
            ws.cell(row=current_row, column=2, value="Fechamento"),
            ws.cell(row=current_row, column=3, value=conclusion),
            ws.cell(row=current_row, column=4, value="Próximos passos"),
        ]
        for c in row_cells:
            c.font = regular_font
            c.border = thin_border
            c.alignment = Alignment(vertical="top", wrap_text=True)
        current_row += 1

    if sources:
        for s in sources:
            row_cells = [
                ws.cell(row=current_row, column=1, value="Fontes Consultadas"),
                ws.cell(row=current_row, column=2, value="Referência"),
                ws.cell(row=current_row, column=3, value=s),
                ws.cell(row=current_row, column=4, value="Documento corporativo"),
            ]
            for c in row_cells:
                c.font = regular_font
                c.border = thin_border
                c.alignment = Alignment(vertical="top", wrap_text=True)
            current_row += 1

    ws.column_dimensions["A"].width = 24
    ws.column_dimensions["B"].width = 18
    ws.column_dimensions["C"].width = 70
    ws.column_dimensions["D"].width = 22

    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def build_pptx_bytes(title: str, summary: str, sections: list, conclusion: str, sources: list, timestamp: datetime) -> bytes:
    """Gera o binário de uma apresentação PowerPoint (.pptx) widescreen 16:9 estilizada."""
    if not HAS_PPTX:
        raise RuntimeError("Biblioteca python-pptx não encontrada para geração de PPTX.")

    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    blank_layout = prs.slide_layouts[6]

    # Slide 1: Cover Slide
    cover_slide = prs.slides.add_slide(blank_layout)
    bg = cover_slide.shapes.add_shape(1, 0, 0, Inches(13.333), Inches(7.5))
    bg.fill.solid()
    bg.fill.fore_color.rgb = PptxRGBColor(15, 23, 42)
    bg.line.fill.background()

    tx_sub = cover_slide.shapes.add_textbox(Inches(1.2), Inches(2.2), Inches(10), Inches(0.5))
    p_sub = tx_sub.text_frame.paragraphs[0]
    p_sub.text = "OMNICHANNEL PLATFORM · APRESENTAÇÃO EXECUTIVA"
    p_sub.font.size = PptxPt(12)
    p_sub.font.bold = True
    p_sub.font.color.rgb = PptxRGBColor(148, 163, 184)

    tx_title = cover_slide.shapes.add_textbox(Inches(1.2), Inches(2.8), Inches(11), Inches(2.2))
    tf_title = tx_title.text_frame
    tf_title.word_wrap = True
    p_title = tf_title.paragraphs[0]
    p_title.text = title
    p_title.font.size = PptxPt(36)
    p_title.font.bold = True
    p_title.font.color.rgb = PptxRGBColor(255, 255, 255)

    tx_meta = cover_slide.shapes.add_textbox(Inches(1.2), Inches(5.2), Inches(10), Inches(0.6))
    p_meta = tx_meta.text_frame.paragraphs[0]
    p_meta.text = f"Gerado em: {timestamp.strftime('%d/%m/%Y às %H:%M UTC')} · Omnichannel Intelligence"
    p_meta.font.size = PptxPt(11)
    p_meta.font.color.rgb = PptxRGBColor(148, 163, 184)

    def add_content_slide(slide_title: str, paragraphs_list: list, items_list: list = None):
        slide = prs.slides.add_slide(blank_layout)
        top_bar = slide.shapes.add_shape(1, Inches(0.8), Inches(0.8), Inches(11.733), Inches(0.04))
        top_bar.fill.solid()
        top_bar.fill.fore_color.rgb = PptxRGBColor(226, 232, 240)
        top_bar.line.fill.background()

        tx_h = slide.shapes.add_textbox(Inches(0.8), Inches(0.9), Inches(11.733), Inches(0.8))
        p_h = tx_h.text_frame.paragraphs[0]
        p_h.text = slide_title
        p_h.font.size = PptxPt(22)
        p_h.font.bold = True
        p_h.font.color.rgb = PptxRGBColor(15, 23, 42)

        tx_body = slide.shapes.add_textbox(Inches(0.8), Inches(1.8), Inches(11.733), Inches(4.8))
        tf_body = tx_body.text_frame
        tf_body.word_wrap = True

        first = True
        for p_text in paragraphs_list:
            if not p_text:
                continue
            p = tf_body.paragraphs[0] if first else tf_body.add_paragraph()
            first = False
            p.text = p_text
            p.font.size = PptxPt(14)
            p.font.color.rgb = PptxRGBColor(51, 65, 85)
            p.space_after = PptxPt(10)

        for it in (items_list or []):
            if not it:
                continue
            p = tf_body.paragraphs[0] if first else tf_body.add_paragraph()
            first = False
            p.text = f"•  {it}"
            p.font.size = PptxPt(13)
            p.font.color.rgb = PptxRGBColor(30, 41, 59)
            p.space_after = PptxPt(6)

        tx_foot = slide.shapes.add_textbox(Inches(0.8), Inches(6.8), Inches(11.733), Inches(0.4))
        p_foot = tx_foot.text_frame.paragraphs[0]
        p_foot.text = "OMNICHANNEL PLATFORM · Documento Corporativo Confidencial"
        p_foot.font.size = PptxPt(9)
        p_foot.font.color.rgb = PptxRGBColor(148, 163, 184)

    if summary:
        add_content_slide("Resumo Executivo", [summary])

    for sec in sections:
        h = sec.get("heading") or "Tópico"
        paras = sec.get("paragraphs") or []
        items = sec.get("items") or []
        add_content_slide(h, paras, items)

    if conclusion:
        add_content_slide("Conclusão e Próximos Passos", [conclusion])

    if sources:
        add_content_slide("Fontes Consultadas", [], sources)

    buffer = io.BytesIO()
    prs.save(buffer)
    return buffer.getvalue()


def render_document(raw_content, sources, *, generated_at=None, file_format="pdf"):
    """
    Renderiza o documento em múltiplos formatos: PDF (padrão), DOCX, XLSX, PPTX e MD.
    Retorna dicionário contendo nome do arquivo, conteúdo (base64 para binários, texto para MD),
    mime_type, representação Markdown para exibição prévia no chat e format.
    """
    raw_content = _text(raw_content)
    if not raw_content:
        raise ValueError("O documento não possui conteúdo.")
    candidate = re.sub(r"^```(?:json)?\s*\n?([\s\S]*?)\n?```$", r"\1", raw_content).strip()
    try:
        data = json.loads(candidate)
    except (json.JSONDecodeError, ValueError):
        data = None

    title = "Documento empresarial"
    summary = ""
    conclusion = ""
    parsed_sections = []
    body = []

    if isinstance(data, dict):
        title = _text(data.get("title")) or title
        summary = _text(data.get("summary"))
        if summary:
            body.extend(["## Resumo", _plain(summary)])
        sections = data.get("sections")
        for index, section in enumerate(sections if isinstance(sections, list) else [], 1):
            if not isinstance(section, dict):
                continue
            paragraphs = section.get("paragraphs")
            items = section.get("items")
            paragraphs = [_plain(p) for p in paragraphs if _text(p)] if isinstance(paragraphs, list) else []
            items = [_line(item) for item in items if _text(item)] if isinstance(items, list) else []
            if not paragraphs and not items:
                continue
            heading = _line(section.get("heading")) or f"Seção {index}"
            parsed_sections.append({"heading": heading, "paragraphs": paragraphs, "items": items})
            body.extend([f"## {heading}", *paragraphs])
            if items:
                body.append("\n".join(f"- {item}" for item in items))
        conclusion = _text(data.get("conclusion"))
        if conclusion:
            body.extend(["## Conclusão", _plain(conclusion)])

    if not body:
        # Preserve an unstructured response when the model does not follow JSON.
        body = ["## Conteúdo", _plain(candidate)]
        paragraphs = [p.strip() for p in candidate.split("\n\n") if p.strip()]
        parsed_sections = [{"heading": "Conteúdo", "paragraphs": paragraphs, "items": []}]

    timestamp = generated_at or datetime.now(timezone.utc)
    source_names = list(dict.fromkeys(_text(source) for source in sources if _text(source)))
    references = "\n".join(f"- {_line(source)}" for source in source_names) or "Nenhuma fonte documental consultada."
    markdown_content = "\n\n".join([
        f"# {_line(title)}", "**OMNICHANNEL · Documento empresarial**",
        f"**Gerado em:** {timestamp.strftime('%d/%m/%Y às %H:%M UTC')}",
        "---", *body, "---", "## Fontes consultadas", references,
    ]) + "\n"
    slug = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", slug.lower()).strip("-")[:70].rstrip("-") or "documento"

    fmt = (file_format or "pdf").lower().strip()
    timestamp_str = timestamp.strftime('%Y%m%d-%H%M%S')

    # 1. DOCX (Word)
    if fmt in ["docx", "dockx", "word"]:
        try:
            docx_bytes = build_docx_bytes(title, summary, parsed_sections, conclusion, source_names, timestamp)
            return {
                "name": f"{slug}-{timestamp_str}.docx",
                "content": base64.b64encode(docx_bytes).decode("ascii"),
                "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "markdown": markdown_content,
                "format": "docx",
            }
        except Exception:
            logger.exception("Falha ao gerar DOCX; tentando outros formatos")

    # 2. XLSX (Excel)
    elif fmt in ["xlsx", "excel", "planilha"]:
        try:
            xlsx_bytes = build_xlsx_bytes(title, summary, parsed_sections, conclusion, source_names, timestamp)
            return {
                "name": f"{slug}-{timestamp_str}.xlsx",
                "content": base64.b64encode(xlsx_bytes).decode("ascii"),
                "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "markdown": markdown_content,
                "format": "xlsx",
            }
        except Exception:
            logger.exception("Falha ao gerar XLSX; tentando outros formatos")

    # 3. PPTX (PowerPoint)
    elif fmt in ["pptx", "powerpoint", "slides", "apresentacao", "apresentação"]:
        try:
            pptx_bytes = build_pptx_bytes(title, summary, parsed_sections, conclusion, source_names, timestamp)
            return {
                "name": f"{slug}-{timestamp_str}.pptx",
                "content": base64.b64encode(pptx_bytes).decode("ascii"),
                "mime_type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "markdown": markdown_content,
                "format": "pptx",
            }
        except Exception:
            logger.exception("Falha ao gerar PPTX; tentando outros formatos")

    # 4. MD (Markdown)
    elif fmt in ["md", "markdown"]:
        return {
            "name": f"{slug}-{timestamp_str}.md",
            "content": markdown_content,
            "mime_type": "text/markdown",
            "markdown": markdown_content,
            "format": "md",
        }

    # 5. PDF (Padrão)
    if HAS_REPORTLAB:
        try:
            pdf_bytes = build_pdf_bytes(title, summary, parsed_sections, conclusion, source_names, timestamp)
            return {
                "name": f"{slug}-{timestamp_str}.pdf",
                "content": base64.b64encode(pdf_bytes).decode("ascii"),
                "mime_type": "application/pdf",
                "markdown": markdown_content,
                "format": "pdf",
            }
        except Exception:
            logger.exception("Falha ao gerar PDF via ReportLab; revertendo para Markdown")

    # Fallback geral para Markdown se a biblioteca necessária não estiver instalada
    return {
        "name": f"{slug}-{timestamp_str}.md",
        "content": markdown_content,
        "mime_type": "text/markdown",
        "markdown": markdown_content,
        "format": "md",
    }
