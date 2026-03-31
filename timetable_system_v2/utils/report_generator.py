from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from datetime import datetime
import os

class ReportGenerator:
    def __init__(self):
        self.styles = getSampleStyleSheet()
    
    def generate_pdf(self, timetable, schedules, department):
        os.makedirs('reports', exist_ok=True)
        filename = f"reports/tt_{timetable['id']}.pdf"
        doc = SimpleDocTemplate(filename, pagesize=A4)
        story = []
        
        title = Paragraph(f"<b>Timetable - {department['name']}</b>", self.styles['Title'])
        story.append(title)
        story.append(Spacer(1, 0.2*inch))
        
        info = f"Semester: {timetable['semester']} | Year: {timetable['academic_year']}"
        story.append(Paragraph(info, self.styles['Normal']))
        story.append(Spacer(1, 0.3*inch))
        
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        time_slots = ['9:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-1:00', '2:00-3:00', '3:00-4:00', '4:00-5:00']
        
        organized = {day: {slot: None for slot in time_slots} for day in days}
        for s in schedules:
            if s['day'] in organized and s['time_slot'] in organized[s['day']]:
                organized[s['day']][s['time_slot']] = dict(s)
        
        table_data = [['Time'] + days]
        for slot in time_slots:
            row = [slot]
            for day in days:
                sch = organized[day][slot]
                row.append(f"{sch['subject_name']}\n{sch['faculty_name']}" if sch else '-')
            table_data.append(row)
        
        t = Table(table_data, colWidths=[inch] + [1.2*inch] * 6)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        story.append(t)
        doc.build(story)
        return filename
