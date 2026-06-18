"""PDF Generation Agent — generates downloadable PDF documents.

Capabilities:
- Payment invoices / receipts
- Application summaries
- Visa cover letters formatted as PDF
"""

import io
from datetime import datetime
from typing import Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
)


def _styles():
    navy = colors.HexColor('#0a2c8a')
    grey = colors.HexColor('#475569')
    styles = getSampleStyleSheet()
    return {
        'title': ParagraphStyle('title', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=24, textColor=navy, spaceAfter=4),
        'subtitle': ParagraphStyle('sub', parent=styles['Normal'], fontSize=10, textColor=grey, spaceAfter=18),
        'h2': ParagraphStyle('h2', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=13, textColor=navy, spaceBefore=12, spaceAfter=6),
        'body': ParagraphStyle('body', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#0f172a'), leading=14),
        'small': ParagraphStyle('small', parent=styles['Normal'], fontSize=8, textColor=grey),
    }


def _make_table(rows: list, col_widths: list[float]) -> Table:
    grey = colors.HexColor('#475569')
    navy = colors.HexColor('#0a2c8a')
    t = Table(rows, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('FONT', (0, 0), (-1, -1), 'Helvetica', 10),
        ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 10),
        ('TEXTCOLOR', (0, 0), (0, -1), grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), navy) if rows and rows[0] else ('',),
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, navy) if rows and len(rows) > 1 else ('',),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    return t


def generate_invoice_pdf(
    invoice_id: str,
    customer_name: str,
    customer_email: str,
    items: list[dict],
    amount_paid: float,
    currency: str = 'USD',
    payment_method: str = 'Razorpay',
) -> bytes:
    """Generate a payment invoice PDF."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18*mm, rightMargin=18*mm, topMargin=20*mm, bottomMargin=20*mm)
    s = _styles()
    elements = []

    elements.append(Paragraph('We Hive — Invoice', s['title']))
    elements.append(Paragraph(f'Invoice #{invoice_id}  ·  {datetime.utcnow().strftime("%d %b %Y, %H:%M UTC")}', s['subtitle']))
    elements.append(Spacer(1, 6*mm))

    # Customer
    elements.append(Paragraph('Bill To', s['h2']))
    elements.append(_make_table([
        ['Customer', customer_name],
        ['Email', customer_email],
    ], [35*mm, 130*mm]))
    elements.append(Spacer(1, 6*mm))

    # Items table
    elements.append(Paragraph('Services', s['h2']))
    header = [['Description', 'Amount']]
    item_rows = [[item.get('name', 'Service'), f'{currency} {item.get("amount", 0):,.2f}'] for item in items]
    total_row = [['Total', f'{currency} {amount_paid:,.2f}']]
    t = _make_table(header + item_rows + total_row, [140*mm, 40*mm])
    elements.append(t)
    elements.append(Spacer(1, 4*mm))
    elements.append(Paragraph(f'Paid via {payment_method}  ·  {datetime.utcnow().strftime("%d %b %Y")}', s['small']))

    doc.build(elements)
    return buf.getvalue()


def generate_application_summary_pdf(app: dict, user: dict) -> bytes:
    """Generate a downloadable application summary PDF."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18*mm, rightMargin=18*mm, topMargin=20*mm, bottomMargin=20*mm)
    s = _styles()
    elements = []

    elements.append(Paragraph('We Hive — Application Summary', s['title']))
    elements.append(Paragraph(f'App #{app["_id"][:8].upper()}  ·  {datetime.utcnow().strftime("%d %b %Y, %H:%M UTC")}', s['subtitle']))
    elements.append(Spacer(1, 6*mm))

    # Customer
    elements.append(Paragraph('Applicant', s['h2']))
    elements.append(_make_table([
        ['Name', user.get('name') or '—'],
        ['Email', user.get('email') or '—'],
        ['Phone', user.get('phone') or '—'],
    ], [35*mm, 130*mm]))
    elements.append(Spacer(1, 6*mm))

    # Application details
    elements.append(Paragraph('Application Details', s['h2']))
    elements.append(_make_table([
        ['Country', (app.get('country_name') or app.get('country_id', '—')).upper()],
        ['Visa Type', app.get('visa_type', '—')],
        ['Travel Date', app.get('travel_date') or 'Not set'],
        ['Status', app.get('status', 'draft').replace('_', ' ').title()],
        ['Created', app.get('created_at', datetime.utcnow()).strftime('%d %b %Y') if hasattr(app.get('created_at'), 'strftime') else str(app.get('created_at', ''))],
    ], [35*mm, 130*mm]))
    elements.append(Spacer(1, 6*mm))

    # Documents
    docs = app.get('documents') or []
    if docs:
        elements.append(Paragraph('Documents', s['h2']))
        doc_rows = [['Type', 'File', 'Status']]
        for d in docs:
            doc_rows.append([d.get('doc_type', '—'), d.get('filename', '—'), d.get('status', 'uploaded').title()])
        elements.append(_make_table(doc_rows, [40*mm, 90*mm, 35*mm]))
        elements.append(Spacer(1, 6*mm))

    # Timeline
    timeline = app.get('timeline') or []
    if timeline:
        elements.append(Paragraph('Timeline', s['h2']))
        tl_rows = [['Date', 'Event']]
        for ev in timeline:
            at = ev.get('at')
            at_s = at.strftime('%d %b %Y %H:%M') if hasattr(at, 'strftime') else str(at)
            tl_rows.append([at_s, ev.get('label', '')])
        elements.append(_make_table(tl_rows, [40*mm, 125*mm]))

    doc.build(elements)
    return buf.getvalue()
