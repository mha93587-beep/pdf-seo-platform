from reportlab.pdfgen import canvas
c = canvas.Canvas("test_searchable.pdf")
c.drawString(100, 500, "Hello World")
c.save()

import pypdf
reader = pypdf.PdfReader("test_searchable.pdf")
def visitor(text, cm, tm, fontDict, fontSize):
    print(f'Text: {text}, tm: {tm}')
reader.pages[0].extract_text(visitor_text=visitor)
