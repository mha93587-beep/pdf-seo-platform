import os
import time
import requests
import argparse
import io
from pypdf import PdfReader, PdfWriter
from fpdf import FPDF
from dotenv import load_dotenv

def process_pdf(pdf_path, output_path, api_key):
    url = "https://www.datalab.to/api/v1/marker"
    headers = {"X-Api-Key": api_key}
    
    print(f"Uploading {pdf_path} to Datalab Marker API...")
    with open(pdf_path, "rb") as f:
        files = {"file": ("input.pdf", f, "application/pdf")}
        data = {
            "output_format": "json",
            "word_bboxes": "true",
            "force_ocr": "true",
            "paginate": "true",
            "langs": "en"
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
            if 'bbox' in obj and 'text' in obj:
                words.append(obj)
            for k, v in obj.items():
                if isinstance(v, (dict, list)):
                    words.extend(extract_words(v))
        elif isinstance(obj, list):
            for item in obj:
                if isinstance(item, (dict, list)):
                    words.extend(extract_words(item))
        return words

    words = extract_words(result_json.get('json', {}).get('children', []))
    if not words:
        print("No words found in Marker output.")
        return
        
    reader = PdfReader(pdf_path)
    writer = PdfWriter()
    
    max_x = max([w['bbox'][2] for w in words]) if words else 1.0
    max_y = max([w['bbox'][3] for w in words]) if words else 1.0
    
    total_pdf_height = sum([float(page.mediabox.height) for page in reader.pages])
    pdf_width = float(reader.pages[0].mediabox.width)
    
    scale_x = pdf_width / max_x if max_x > 0 else 1.0
    scale_y = total_pdf_height / max_y if max_y > 0 else 1.0
    
    for i, page in enumerate(reader.pages):
        width = float(page.mediabox.width)
        height = float(page.mediabox.height)
        
        pdf = FPDF(unit='pt', format=[width, height])
        pdf.add_page()
        pdf.set_font('Arial', '', 10)
        
        current_y_top = sum([float(p.mediabox.height) for p in reader.pages[:i]])
        current_y_bottom = current_y_top + height
        
        has_text = False
        for w in words:
            text = w['text']
            bbox = w['bbox']
            
            x0, y0, x1, y1 = bbox[0]*scale_x, bbox[1]*scale_y, bbox[2]*scale_x, bbox[3]*scale_y
            
            if current_y_top <= y0 < current_y_bottom:
                page_y0 = y0 - current_y_top
                page_y1 = y1 - current_y_top
                
                fontsize = y1 - y0
                if fontsize <= 0: fontsize = 10
                
                pdf.set_font('Arial', '', fontsize)
                
                safe_text = text.encode('latin-1', 'ignore').decode('latin-1')
                pdf.text(x0, page_y1 + fontsize, safe_text)
                has_text = True
                
        if has_text:
            text_pdf_bytes = pdf.output(dest='S').encode('latin-1')
            text_reader = PdfReader(io.BytesIO(text_pdf_bytes))
            text_page = text_reader.pages[0]
            
            for contents in text_page.get_contents():
                contents_data = contents.get_data()
                contents_data = contents_data.replace(b'BT', b'BT\n3 Tr\n')
                contents.set_data(contents_data)
                
            page.merge_page(text_page)
            
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
