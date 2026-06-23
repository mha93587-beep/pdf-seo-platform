import pypdf
import json

reader = pypdf.PdfReader('rakesh_math_output.pdf')
page = reader.pages[0]

existing_words = []
def visitor_body(text, cm, tm, fontDict, fontSize):
    text = text.strip()
    if text:
        existing_words.append({
            'text': text,
            'x': tm[4],
            'y': tm[5]
        })

page.extract_text(visitor_text=visitor_body)

# Let's say we have a new word to draw
new_words = [
    {'text': 'नवीन', 'x0': 241.0, 'pdf_y': 689.1}, # Should be duplicate
    {'text': 'अंकगणित', 'x0': 93.3, 'pdf_y': 573.3}, # Should be duplicate
    {'text': 'NEW WORD', 'x0': 100, 'pdf_y': 100} # Should NOT be duplicate
]

for w in new_words:
    is_dup = False
    for ew in existing_words:
        if w['text'] in ew['text'] or ew['text'] in w['text']:
            if abs(ew['x'] - w['x0']) < 50 and abs(ew['y'] - w['pdf_y']) < 50:
                is_dup = True
                break
    print(f"Word '{w['text']}' is duplicate? {is_dup}")
