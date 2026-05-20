"""
PDF report generator using ReportLab.
"""

import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from loguru import logger


def generate_pdf(report_data: dict, output_dir: str = "./reports") -> str:
    """Generate a PDF report and return the file path."""
    os.makedirs(output_dir, exist_ok=True)

    filename = f"grc_report_{report_data.get('assessment_id', 'unknown')}.pdf"
    filepath = os.path.join(output_dir, filename)

    doc = SimpleDocTemplate(filepath, pagesize=A4,
                            rightMargin=72, leftMargin=72,
                            topMargin=72, bottomMargin=72)

    styles = getSampleStyleSheet()

    # Custom styles
    styles.add(ParagraphStyle(
        name='CustomTitle',
        fontName='Helvetica-Bold',
        fontSize=22,
        textColor=HexColor('#1a1a1a'),
        spaceAfter=6,
        alignment=TA_LEFT,
    ))
    styles.add(ParagraphStyle(
        name='Subtitle',
        fontName='Helvetica',
        fontSize=11,
        textColor=HexColor('#666666'),
        spaceAfter=20,
    ))
    styles.add(ParagraphStyle(
        name='SectionHead',
        fontName='Helvetica-Bold',
        fontSize=13,
        textColor=HexColor('#333333'),
        spaceBefore=16,
        spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        name='BodyText2',
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        spaceAfter=6,
    ))

    story = []

    # Title
    story.append(Paragraph("GRC Assessment Report", styles['CustomTitle']))
    story.append(Paragraph(
        f"Framework: {report_data.get('framework', 'N/A')} | "
        f"Organization: {report_data.get('organization', 'N/A')} | "
        f"Date: {datetime.utcnow().strftime('%Y-%m-%d')}",
        styles['Subtitle']
    ))

    # Executive Summary
    story.append(Paragraph("Executive Summary", styles['SectionHead']))
    story.append(Paragraph(report_data.get('executive_summary', ''), styles['BodyText2']))
    story.append(Spacer(1, 12))

    # Score
    score = report_data.get('compliance_score', 0)
    risk = report_data.get('risk_level', 'N/A')
    story.append(Paragraph(f"Compliance Score: {score}% | Risk Level: {risk}", styles['BodyText2']))
    story.append(Spacer(1, 12))

    # Domain Scores
    story.append(Paragraph("Domain Scores", styles['SectionHead']))
    domain_data = [["Domain", "Score", "Total", "Answered"]]
    for d in report_data.get('domain_scores', []):
        domain_data.append([
            d.get('domain', ''),
            f"{d.get('score', 0)}%",
            str(d.get('questions_total', 0)),
            str(d.get('questions_answered', 0)),
        ])

    t = Table(domain_data)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#333333')),
        ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#ffffff')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f5f5f5')),
        ('GRID', (0, 0), (-1, -1), 1, HexColor('#cccccc')),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
    ]))
    story.append(t)
    story.append(Spacer(1, 16))

    # Recommendations
    story.append(Paragraph("Recommendations", styles['SectionHead']))
    for rec in report_data.get('recommendations', []):
        story.append(Paragraph(
            f"<b>{rec.get('title', '')}</b> [{rec.get('priority', '').upper()}] "
            f"({rec.get('horizon', '')})",
            styles['BodyText2']
        ))
        story.append(Paragraph(rec.get('detail', ''), styles['BodyText2']))
        story.append(Paragraph(f"Est. Cost: INR {rec.get('cost_inr', 0):,} | Effort: {rec.get('effort', '')}", styles['BodyText2']))
        story.append(Spacer(1, 8))

    # Cost Summary
    story.append(Paragraph("Cost Summary", styles['SectionHead']))
    cost = report_data.get('cost_summary', {})
    story.append(Paragraph(f"Total Estimated Cost: INR {cost.get('total_inr', 0):,}", styles['BodyText2']))
    story.append(Paragraph(f"Critical Items: INR {cost.get('critical_inr', 0):,}", styles['BodyText2']))

    # Gap Analysis
    story.append(Paragraph("Detailed Gap Analysis", styles['SectionHead']))
    gap_data = [["Control ID", "Domain", "Current Status", "Severity"]]
    for g in report_data.get('gap_analysis', []):
        gap_data.append([
            g.get('control_id') or g.get('question_id', ''),
            g.get('domain', ''),
            g.get('current_state') or g.get('current_status', ''),
            g.get('gap_severity') or g.get('impact', '')
        ])
    
    if len(gap_data) > 1:
        gt = Table(gap_data, colWidths=[1*inch, 1.5*inch, 1.5*inch, 1*inch])
        gt.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#444444')),
            ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#ffffff')),
            ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#dddddd')),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
        ]))
        story.append(gt)
    else:
        story.append(Paragraph("No significant gaps identified.", styles['BodyText2']))
    story.append(Spacer(1, 16))

    # Risk Analysis
    story.append(Paragraph("Risk Assessment", styles['SectionHead']))
    risk_info = report_data.get('risk_analysis', {})
    story.append(Paragraph(f"Overall Risk Profile: {report_data.get('risk_level', 'Unknown')}", styles['BodyText2']))
    
    risk_table = [["Title", "Severity", "Justification"]]
    for r in risk_info.get('risks', []):
        risk_table.append([
            r.get('title', ''),
            r.get('severity', '').upper(),
            r.get('justification') or r.get('description', '')
        ])
    
    if len(risk_table) > 1:
        rt = Table(risk_table, colWidths=[1.5*inch, 1*inch, 3*inch])
        rt.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#661111')),
            ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#ffffff')),
            ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#dddddd')),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
        ]))
        story.append(rt)
    story.append(Spacer(1, 16))

    # Traceability Matrix
    story.append(Paragraph("Traceability Matrix", styles['SectionHead']))
    trace_data = [["Ref ID", "Score", "Finding"]]
    for t_item in report_data.get('traceability_matrix', []):
        trace_data.append([
            t_item.get('question', ''),
            f"{t_item.get('mapped_score', 0)}%",
            t_item.get('finding', '')
        ])
    
    if len(trace_data) > 1:
        tt = Table(trace_data, colWidths=[2*inch, 1*inch, 2*inch])
        tt.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#333366')),
            ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#ffffff')),
            ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#dddddd')),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
        ]))
        story.append(tt)

    doc.build(story)
    logger.info(f"PDF generated: {filepath}")
    return filepath
