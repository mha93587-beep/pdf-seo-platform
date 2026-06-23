import os
import requests
import time
from dotenv import load_dotenv

load_dotenv('/storage/emulated/0/antigravity/pdfsearchability/.env')
API_KEY = os.environ.get('DATALAB_MARKER_API')

headers = {"X-Api-Key": API_KEY}
url = "https://www.datalab.to/api/v1/marker"
file_path = "/storage/emulated/0/antigravity/pdfsearchability/attached_assets/SplitPDFFile_1_to_5.pdf"

print("Uploading file...")
with open(file_path, "rb") as f:
    files = {"file": f}
    data = {"langs": "en", "output_formats": "json,markdown", "force_ocr": True, "paginate": True}
    response = requests.post(url, headers=headers, files=files, data=data)

if response.status_code != 200:
    print(f"Error: {response.status_code} {response.text}")
    exit(1)

req_id = response.json().get("request_check_url")
print(f"Request Check URL: {req_id}")

max_attempts = 30
for attempt in range(max_attempts):
    print(f"Checking status (attempt {attempt+1})...")
    res = requests.get(req_id, headers=headers)
    if res.status_code == 200:
        status = res.json().get("status")
        if status == "complete":
            print("Completed!")
            with open("marker_output.json", "w") as out:
                out.write(res.text)
            print(res.json())
            break
        elif status == "error":
            print(f"Error in processing: {res.json()}")
            break
    else:
        print(f"Error checking status: {res.status_code} {res.text}")
    time.sleep(5)
