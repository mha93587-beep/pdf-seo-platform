import os
import time
import requests
import argparse
import io
import re
import html as html_lib
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from dotenv import load_dotenv

def latex_to_text(latex_str):
    s = latex_str.replace("\\[", "").replace("\\]", "").replace("$", "")
    s = re.sub(r"\\frac{([^{}]+)}{([^{}]+)}", r"\1 \\\\ \2", s)
    s = re.sub(r"\\frac", "", s)
    replacements = {
        r"\\times": "×",
        r"\\dots": "...",
        r"\\because": "∵",
        r"\\therefore": "∴",
        r"\\left\[": "[",
        r"\\right\]": "]",
        r"\\left\{": "{",
        r"\\right\}": "}",
        r"\\left\(": "(",
        r"\\right\)": ")",
        r"\\{": "{",
        r"\\}": "}",
        r"\\cdot": "·",
        r"\\div": "÷",
        r"\\quad": " ",
        r"\\leq": "≤",
        r"\\geq": "≥",
        r"\\neq": "≠",
        r"\\approx": "≈",
        r"\\sqrt": "√",
    }
    for k, v in replacements.items():
        s = re.sub(k, v, s)
    return s.strip()

def process_pdf(pdf_path, output_path, api_key):
    url = "https://www.datalab.to/api/v1/marker"
    headers = {"X-Api-Key": api_key}
    
    # Register FreeSerif for massive multilingual support (Latin, Cyrillic, Indic, Arabic, etc.)
    pdfmetrics.registerFont(TTFont('FreeSerif', 'FreeSerif.ttf'))
    # Register CJK fonts (Built-in ReportLab CIDFonts)
    pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light')) # Chinese
    pdfmetrics.registerFont(UnicodeCIDFont('HeiseiMin-W3')) # Japanese
    pdfmetrics.registerFont(UnicodeCIDFont('HYSMyeongJo-Medium')) # Korean
    
    print(f"Uploading {pdf_path} to Datalab Marker API...")
    with open(pdf_path, "rb") as f:
        files = {"file": ("input.pdf", f, "application/pdf")}
        data = {
            "output_format": "json",
            "word_bboxes": "true",
            "force_ocr": "true",
            "paginate": "true",
            "langs": "en,hi"
        }
        response = requests.post(url, headers=headers, files=files, data=data)
    
    if response.status_code != 200:
        print(f"Error starting job: {response.status_code} {response.text}")
        return
        
    req_id = response.json().get("request_check_url")
    print(f"Job started. Checking status at: {req_id}")
    
    result_json = None
    for attempt in range(60):
        print(f"Checking status (attempt {attempt+1})...")
        res = requests.get(req_id, headers=headers)
        if res.status_code == 200:
            status = res.json().get("status")
            if status == "complete":
                print("Processing completed!")
                result_json = res.json()
                break
            elif status == "error":
                print(f"Error in processing: {res.json()}")
                return
        time.sleep(5)
        
    if not result_json:
        print("Timeout waiting for result.")
        return

    print("Embedding hidden text into PDF...")
    
    def extract_words(obj):
        words = []
        if isinstance(obj, dict):
            # Ignore HTML processing for Page nodes to prevent duplicate extraction
            if obj.get('block_type') == 'Page':
                pass
            else:
                # Extract Image descriptions for SEO
                if obj.get('block_type') == 'Picture' and 'html' in obj and isinstance(obj['html'], str):
                    alt_matches = re.findall(r'<img[^>]*alt=\"([^\"]+)\"', obj['html'])
                    desc_matches = re.findall(r'<div class=\"img-alt\">(.*?)</div>', obj['html'])
                    combined = []
                    for m in alt_matches + desc_matches:
                        if m not in combined:
                            combined.append(m)
                    combined_alt = " ".join(combined).strip()
                    if combined_alt and 'bbox' in obj:
                        words.append({'bbox': obj['bbox'], 'text': '[Image: ' + html_lib.unescape(combined_alt) + ']'})
                        
                if 'html' in obj and isinstance(obj['html'], str):
                    has_spans = False
                    try:
                        from bs4 import BeautifulSoup
                        soup = BeautifulSoup(obj['html'], 'html.parser')
                        items = []
                        for child in soup.descendants:
                            if getattr(child, 'name', None) == 'span' and child.has_attr('data-bbox'):
                                coords = [float(x) for x in child['data-bbox'].split()]
                                if len(coords) == 4:
                                    items.append({'type': 'span', 'bbox': coords, 'text': child.get_text()})
                            elif getattr(child, 'name', None) == 'math':
                                parent_bbox = None
                                p = child.parent
                                while p:
                                    if p.has_attr('data-bbox'):
                                        try:
                                            parent_bbox = [float(x) for x in p['data-bbox'].split()]
                                            break
                                        except: pass
                                    p = p.parent
                                items.append({'type': 'math', 'bbox': parent_bbox, 'text': child.get_text()})
                        
                        for i, item in enumerate(items):
                            if item['bbox'] is None:
                                prev_bbox = next((items[j]['bbox'] for j in range(i-1, -1, -1) if items[j]['bbox']), None)
                                next_bbox = next((items[j]['bbox'] for j in range(i+1, len(items)) if items[j]['bbox']), None)
                                
                                new_bbox = None
                                if prev_bbox and next_bbox:
                                    if abs(prev_bbox[1] - next_bbox[1]) < 20: # Same line
                                        new_bbox = [prev_bbox[2], min(prev_bbox[1], next_bbox[1]), next_bbox[0], max(prev_bbox[3], next_bbox[3])]
                                    else: # Different lines
                                        new_bbox = [prev_bbox[2], prev_bbox[1], 1000.0, next_bbox[1]]
                                elif prev_bbox:
                                    new_bbox = [prev_bbox[2], prev_bbox[1], 1000.0, prev_bbox[3] + 30]
                                elif next_bbox:
                                    new_bbox = [max(0, next_bbox[0] - 150), max(0, next_bbox[1] - 30), next_bbox[0], next_bbox[3]]
                                
                                if new_bbox is None and 'bbox' in obj:
                                    new_bbox = obj['bbox']
                                    
                                item['bbox'] = new_bbox
                                
                        for item in items:
                            if item['bbox']:
                                words.append({'bbox': item['bbox'], 'text': html_lib.unescape(item['text']).strip(), 'is_math': item['type'] == 'math'})
                                has_spans = True
                    except Exception as e:
                        pass
                

                    if not has_spans and 'bbox' in obj and 'text' in obj and obj.get('text'):
                        words.append({'bbox': obj['bbox'], 'text': obj['text'].strip()})
                elif 'bbox' in obj and 'text' in obj and obj.get('text'):
                    words.append({'bbox': obj['bbox'], 'text': obj['text'].strip()})
                
            for k, v in obj.items():
                if isinstance(v, (dict, list)):
                    words.extend(extract_words(v))
        elif isinstance(obj, list):
            for item in obj:
                if isinstance(item, (dict, list)):
                    words.extend(extract_words(item))
        return words

    reader = PdfReader(pdf_path)
    writer = PdfWriter()
    
    pages_data = result_json.get('json', {}).get('children', [])
    
    for i, page in enumerate(reader.pages):
        existing_words = []
        def visitor_body(text, cm, tm, fontDict, fontSize):
            t = text.strip()
            if t:
                existing_words.append({'text': t, 'x': tm[4], 'y': tm[5]})
        try:
            page.extract_text(visitor_text=visitor_body)
        except Exception:
            pass

        packet = io.BytesIO()
        width = float(page.mediabox.width)
        height = float(page.mediabox.height)
        
        c = canvas.Canvas(packet, pagesize=(width, height))
        
        if i < len(pages_data):
            page_data = pages_data[i]
            raw_words = extract_words(page_data)
            
            def calculate_iou(box1, box2):
                x1_inter = max(box1[0], box2[0])
                y1_inter = max(box1[1], box2[1])
                x2_inter = min(box1[2], box2[2])
                y2_inter = min(box1[3], box2[3])

                if x2_inter < x1_inter or y2_inter < y1_inter:
                    return 0.0

                intersection = (x2_inter - x1_inter) * (y2_inter - y1_inter)
                area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
                area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
                union = area1 + area2 - intersection

                return intersection / union if union > 0 else 0.0

            words = []
            for w in raw_words:
                if not w.get('text'): continue
                
                is_duplicate = False
                for existing_w in words:
                    if calculate_iou(w['bbox'], existing_w['bbox']) > 0.5:
                        if 'is_math' in w and 'is_math' not in existing_w:
                            existing_w.update(w)
                        elif w.get('text', '').startswith('[Image:') and not existing_w.get('text', '').startswith('[Image:'):
                            existing_w.update(w)
                        is_duplicate = True
                        break
                
                if not is_duplicate:
                    words.append(w)
            
            page_bbox = page_data.get('bbox')
            if page_bbox and len(page_bbox) == 4:
                marker_width = page_bbox[2] - page_bbox[0]
                marker_height = page_bbox[3] - page_bbox[1]
            else:
                marker_width = 1092.0
                marker_height = 1400.0
                
            scale_x = width / marker_width if marker_width > 0 else 1.0
            scale_y = height / marker_height if marker_height > 0 else 1.0
            
            for w in words:
                text = w['text']
                bbox = w['bbox']
                
                x0 = bbox[0] * scale_x
                y0 = bbox[1] * scale_y
                y1 = bbox[3] * scale_y
                
                pdf_y = height - y1
                fontsize = y1 - y0
                
                is_duplicate = False
                w_text_lower = text.strip().lower()
                for ew in existing_words:
                    ew_text = ew['text'].lower()
                    if w_text_lower == ew_text or (len(w_text_lower) > 2 and w_text_lower in ew_text) or (len(ew_text) > 2 and ew_text in w_text_lower):
                        if abs(ew['x'] - x0) < 50 and abs(ew['y'] - pdf_y) < 50:
                            is_duplicate = True
                            break
                            
                if is_duplicate:
                    continue
                
                is_math = w.get('is_math', False)
                if is_math:
                    text = latex_to_text(text)
                    
                if text.startswith('[Image:'):
                    fontsize = 8
                    
                if is_math and fontsize > 14:
                    fontsize = 14
                if fontsize > 30:
                    fontsize = 30
                if fontsize <= 0: 
                    fontsize = 10
                    
                lines = [line.strip() for line in re.split(r'\\\\|\n', text) if line.strip()]
                if not lines:
                    continue
                    
                line_height = (y1 - y0) / len(lines)
                for i, line_text in enumerate(lines):
                    current_font_size = min(fontsize, line_height * 0.9) if len(lines) > 1 else fontsize
                    # For multi-line math, distribute Y coordinate evenly within the bounding box
                    current_y = height - y0 - ((i + 1) * line_height) + (line_height * 0.2) if len(lines) > 1 else height - y1 + 2
                    
                    textobject = c.beginText()
                    textobject.setTextRenderMode(3) # 3 = Invisible
                    textobject.setTextOrigin(x0, current_y)
                    
                    has_cjk = any('\u4e00' <= char <= '\u9fff' or '\u3040' <= char <= '\u30ff' or '\uac00' <= char <= '\ud7a3' for char in line_text)
                    if has_cjk:
                        if any('\u3040' <= char <= '\u30ff' for char in line_text):
                            textobject.setFont("HeiseiMin-W3", current_font_size)
                        elif any('\uac00' <= char <= '\ud7a3' for char in line_text):
                            textobject.setFont("HYSMyeongJo-Medium", current_font_size)
                        else:
                            textobject.setFont("STSong-Light", current_font_size)
                        textobject.textOut(line_text + " ")
                    else:
                        textobject.setFont("FreeSerif", current_font_size)
                        try:
                            textobject.textOut(line_text + " ")
                        except:
                            textobject.setFont("Helvetica", current_font_size)
                            safe_text = line_text.encode('latin-1', 'ignore').decode('latin-1')
                            textobject.textOut(safe_text + " ")
                    c.drawText(textobject)
        c.save()
        packet.seek(0)
        new_pdf = PdfReader(packet)
        if len(new_pdf.pages) > 0:
            page.merge_page(new_pdf.pages[0])
        writer.add_page(page)

    with open(output_path, "wb") as output_file:
        writer.write(output_file)
        
    print(f"Searchable PDF saved to: {output_path}")

if __name__ == "__main__":
    load_dotenv('/storage/emulated/0/antigravity/pdfsearchability/.env')
    api_key = os.environ.get('DATALAB_MARKER_API')
    if not api_key:
        print("DATALAB_MARKER_API not found in .env")
        exit(1)
        
    parser = argparse.ArgumentParser()
    parser.add_argument('input_pdf')
    parser.add_argument('output_pdf')
    args = parser.parse_args()
    process_pdf(args.input_pdf, args.output_pdf, api_key)
