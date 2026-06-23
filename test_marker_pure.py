import os
import json
import time
import urllib.request
import urllib.parse
from urllib.error import URLError

env_path = '/storage/emulated/0/antigravity/pdfsearchability/.env'
api_key = None
with open(env_path) as f:
    for line in f:
        if 'DATALAB_MARKER_API' in line:
            api_key = line.split('=')[1].strip().strip('"')

if not api_key:
    print("API Key not found")
    exit(1)

url = "https://www.datalab.to/api/v1/marker"
file_path = "/storage/emulated/0/antigravity/pdfsearchability/attached_assets/SplitPDFFile_1_to_5.pdf"

# Construct multipart form data
import mimetypes
boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'

body = bytearray()
body.extend(f'--{boundary}\r\n'.encode('utf-8'))
body.extend(f'Content-Disposition: form-data; name="file"; filename="SplitPDFFile_1_to_5.pdf"\r\n'.encode('utf-8'))
body.extend(f'Content-Type: application/pdf\r\n\r\n'.encode('utf-8'))
with open(file_path, 'rb') as f:
    body.extend(f.read())
body.extend(b'\r\n')

# other fields
fields = {
    "langs": "en",
    "output_formats": "json",
    "force_ocr": "true",
    "paginate": "true"
}

for k, v in fields.items():
    body.extend(f'--{boundary}\r\n'.format(k, v).encode('utf-8'))
    body.extend(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode('utf-8'))
    body.extend(f'{v}\r\n'.encode('utf-8'))
    
body.extend(f'--{boundary}--\r\n'.encode('utf-8'))

headers = {
    'X-Api-Key': api_key,
    'Content-Type': f'multipart/form-data; boundary={boundary}',
    'Content-Length': str(len(body))
}

req = urllib.request.Request(url, data=body, headers=headers, method='POST')
try:
    with urllib.request.urlopen(req) as response:
        res_data = response.read()
        res_json = json.loads(res_data)
        req_id = res_json.get('request_check_url')
        print(f"Request Check URL: {req_id}")
except Exception as e:
    print(f"Error starting job: {e}")
    exit(1)

max_attempts = 30
for attempt in range(max_attempts):
    print(f"Checking status (attempt {attempt+1})...")
    req = urllib.request.Request(req_id, headers={'X-Api-Key': api_key})
    try:
        with urllib.request.urlopen(req) as response:
            res_json = json.loads(response.read())
            status = res_json.get('status')
            if status == 'complete':
                print("Completed!")
                with open("marker_output.json", "w") as out:
                    json.dump(res_json, out, indent=2)
                break
            elif status == 'error':
                print(f"Error in processing: {res_json}")
                break
    except Exception as e:
        print(f"Error checking status: {e}")
    time.sleep(5)
