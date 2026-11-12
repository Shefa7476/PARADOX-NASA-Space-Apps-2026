
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether
)


NAVY = colors.HexColor("#101D35")
BLUE = colors.HexColor("#2563EB")
LIGHT = colors.HexColor("#EFF6FF")
GREY = colors.HexColor("#475569")


def safe(value):
    return escape(str(value if value is not None else "N/A"))


def make_table(rows, widths=None):
    table = Table(
        rows,
        colWidths=widths,
        repeatRows=1,
        hAlign="LEFT"
    )

    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [
            colors.white, LIGHT
        ]),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8)
    ]))

    return table


def generate_pdf_report(debrief):
    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=(8.27 * inch, 11.69 * inch),
        rightMargin=42,
        leftMargin=42,
        topMargin=48,
        bottomMargin=48,
        title="PARADOX Scientific Mission Debrief",
        author="PARADOX Mission Simulation"
    )

    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        name="ParadoxTitle",
        parent=styles["Title"],
        fontSize=22,
        leading=28,
        textColor=NAVY,
        alignment=TA_CENTER,
        spaceAfter=14
    ))

    styles.add(ParagraphStyle(
        name="ParadoxHeading",
        parent=styles["Heading2"],
        fontSize=13,
        leading=17,
        textColor=BLUE,
        spaceBefore=18,
        spaceAfter=9
    ))

    styles.add(ParagraphStyle(
        name="ParadoxBody",
        parent=styles["BodyText"],
        fontSize=9,
        leading=14,
        textColor=GREY,
        spaceAfter=8,
        wordWrap="CJK"
    ))

    styles.add(ParagraphStyle(
        name="ParadoxCell",
        parent=styles["BodyText"],
        fontSize=8,
        leading=11
    ))

    def p(value):
        return Paragraph(safe(value), styles["ParadoxBody"])

    def cell(value):
        return Paragraph(safe(value), styles["ParadoxCell"])

    def heading(value):
        return Paragraph(
            safe(value),
            styles["ParadoxHeading"]
        )

    story = []

    story.append(Paragraph(
        "PARADOX",
        styles["ParadoxTitle"]
    ))

    story.append(Paragraph(
        "SCIENTIFIC MISSION DEBRIEF",
        styles["ParadoxTitle"]
    ))

    story.append(p(
        f"Mission: {debrief['mission_title']}"
    ))

    story.append(p(
        f"Session: {debrief['session_id']}"
    ))

    story.append(p(
        f"Generated: {debrief['generated_at']}"
    ))

    story.append(heading("Mission Performance"))

    score = debrief["score"]

    score_rows = [
        ["Metric", "Result"],
        ["Mission Status", debrief["status"]],
        ["Difficulty", debrief["difficulty"]],
        ["Final Score", f"{score['total']} / 100"],
        ["Grade", score["grade"]],
        ["Outcome Score", f"{score['outcome']} / 30"],
        ["Decision Score", f"{score['decisions']} / 45"],
        ["Resource Score", f"{score['resources']} / 25"]
    ]

    story.append(make_table(
        score_rows,
        [3.6 * inch, 3.2 * inch]
    ))

    story.append(heading("NASA Solar Flare Event"))

    event = debrief["nasa_event"]

    for label, key in [
        ("Event ID", "event_id"),
        ("Flare Class", "class_type"),
        ("Begin Time", "begin_time"),
        ("Peak Time", "peak_time"),
        ("End Time", "end_time")
    ]:
        story.append(p(
            f"{label}: {event.get(key) or 'Unknown'}"
        ))

    story.append(heading("Resource Analysis"))

    resource_rows = [
        ["Resource", "Initial", "Final", "Change"]
    ]

    for item in debrief["resources"]:
        resource_rows.append([
            item["name"].title(),
            str(item["initial"]),
            str(item["final"]),
            f"{item['change']:+d}"
        ])

    story.append(make_table(
        resource_rows,
        [2.6 * inch, 1.4 * inch, 1.4 * inch, 1.4 * inch]
    ))

    story.append(heading("Decision Timeline"))

    for decision in debrief["decisions"]:
        story.append(KeepTogether([
            Paragraph(
                safe(
                    f"Decision {decision['step']}: "
                    f"{decision['assessment']}"
                ),
                styles["ParadoxHeading"]
            ),
            p(
                f"Path: {decision['from_node']} "
                f"to {decision['to_node']}"
            ),
            p(f"Action: {decision['action']}"),
            p(f"Outcome: {decision['feedback']}"),
            p(
                "Engineering Principle: "
                + decision["scientific_principle"]
            )
        ]))

    story.append(heading("Recommendations"))

    for index, recommendation in enumerate(
        debrief["recommendations"], start=1
    ):
        story.append(p(f"{index}. {recommendation}"))

    story.append(heading("Scientific References"))

    for ref in debrief["references"]:
        story.append(p(
            f"{ref['organization']}: "
            f"{ref['title']} - {ref['url']}"
        ))

    story.append(heading("Scientific Disclaimer"))
    story.append(p(debrief["scientific_disclaimer"]))

    def add_footer(canvas, document):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(GREY)
        canvas.drawString(
            42,
            25,
            "PARADOX | Educational Mission Simulation"
        )
        canvas.drawRightString(
            document.pagesize[0] - 42,
            25,
            f"Page {document.page}"
        )
        canvas.restoreState()

    doc.build(
        story,
        onFirstPage=add_footer,
        onLaterPages=add_footer
    )

    return buffer.getvalue()
