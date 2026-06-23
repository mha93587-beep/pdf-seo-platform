import os
import json
import time
import requests
import fitz  # PyMuPDF
from dotenv import load_dotenv
import argparse

def process_pdf(pdf_path, output_path, api_key):
    url = "https://www.datalab.to/api/v1/marker"
    headers = {"X-Api-Key": api_key}
    
    print(f"Uploading {pdf_path} to Datalab Marker API...")
    with open(pdf_path, "rb") as f:
        files = {"file": f}
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
    
    # Poll for completion
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
    doc = fitz.open(pdf_path)
    
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

    # Iterate through blocks and words.
    # Note: Datalab Marker API output does not strictly separate by page in the tree easily without page_id,
    # but we can try to map them if page_id is present, or assume the PDF has only 1 page or scale by max Y.
    # Actually, children nodes often contain 'page_id' or we can infer from the hierarchy.
    # For a robust tool, if the user's PDF is multipage, we need page info. 
    # Marker JSON structure has a linear stream of blocks if we extract them. Let's look for 'page_id' or 'polygon' etc.
    # Since Marker converts the whole document into a continuous stream, 
    # if it doesn't give page_id per word, we might have to use a heuristic based on total height.
    
    # To properly embed, we fetch words.
    words = extract_words(result_json.get('json', {}).get('children', []))
    
    # We will compute the scaling factor by comparing the bounding box extremes with the PDF size.
    if not words:
        print("No words found in Marker output.")
        return
        
    max_x = max([w['bbox'][2] for w in words])
    max_y = max([w['bbox'][3] for w in words])
    
    # Get total height of all pages to scale correctly
    total_pdf_height = sum([page.rect.height for page in doc])
    pdf_width = doc[0].rect.width
    
    scale_x = pdf_width / max_x if max_x > 0 else 1.0
    scale_y = total_pdf_height / max_y if max_y > 0 else 1.0
    
    # We will assume a single continuous coordinate system vertically if max_y > doc[0].rect.height
    
    for w in words:
        text = w['text']
        bbox = w['bbox']  # [x0, y0, x1, y1]
        
        # Scale coordinates
        x0, y0, x1, y1 = bbox[0]*scale_x, bbox[1]*scale_y, bbox[2]*scale_x, bbox[3]*scale_y
        
        # Find which page this y0 belongs to
        current_y = 0
        target_page_idx = 0
        page_y0 = y0
        
        for i, page in enumerate(doc):
            if current_y <= y0 < current_y + page.rect.height:
                target_page_idx = i
                page_y0 = y0 - current_y
                break
            current_y += page.rect.height
            
        page = doc[target_page_idx]
        
        # Calculate font size based on bounding box height
        fontsize = y1 - y0
        if fontsize <= 0:
            fontsize = 10
            
        # Insert invisible text (render_mode=3)
        # We use a standard font and insert it at the specific rectangle
        rect = fitz.Rect(x0, page_y0, x1, page_y0 + fontsize)
        page.insert_text(rect.bl, text, fontsize=fontsize, render_mode=3)

    doc.save(output_path)
    print(f"Searchable PDF saved to: {output_path}")

if __name__ == "__main__":
    load_dotenv('/storage/emulated/0/antigravity/pdfsearchability/.env')
    api_key = os.environ.get('DATALAB_MARKER_API')
    if not api_key:
        print("DATALAB_MARKER_API not found in .env")
        exit(1)
        
    parser = argparse.ArgumentParser(description='Make PDF Searchable using Datalab Marker')
    parser.add_argument('input_pdf', help='Path to input PDF')
    parser.add_argument('output_pdf', help='Path to output PDF')
    
    args = parser.parse_args()
    process_pdf(args.input_pdf, args.output_pdf, api_key)
