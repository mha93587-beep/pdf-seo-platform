# DocuSEO Developer API Documentation 🔑

Welcome to the **DocuSEO API Documentation**. This guide explains how you can integrate the DocuSEO OCR and searchable PDF generation pipeline directly into your custom applications, scripts, and workflows.

With the DocuSEO API, you can:
- Process remote PDF files programmatically by submitting URLs.
- Process local PDF files by uploading them in multipart form requests.
- Track the real-time processing status of your documents.
- List all available processed documents.

---

## 🔒 Authentication

All API endpoints require authentication using a **Bearer API Key**. 
You can generate your keys directly inside your **DocuSEO Dashboard** -> **Developer API & Docs** tab.

Attach your API Key to the request headers using one of the following methods:

### Method 1: Authorization Bearer Header (Recommended)
```http
Authorization: Bearer ds_live_your_api_key_here
```

### Method 2: Custom X-API-Key Header
```http
x-api-key: ds_live_your_api_key_here
```

---

## 🚀 API Endpoints

### 1. Process PDF via URL
Submit a publicly accessible PDF URL. The platform will fetch it, upload the original to Backblaze B2, register the transaction, and process it in the background.

- **Endpoint**: `POST /api/v1/process-url`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_API_KEY`
- **Request Body**:
  ```json
  {
    "url": "https://example.com/documents/financial-report.pdf"
  }
  ```

- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "order": {
      "id": 42,
      "filename": "financial-report.pdf",
      "status": "processing",
      "original_pdf_url": "https://pdf-seo-platform.onrender.com/api/download?file=original_123_financial-report.pdf",
      "status_check_url": "https://pdf-seo-platform.onrender.com/api/v1/status/42",
      "created_at": "2026-06-24T05:00:00Z"
    }
  }
  ```

---

### 2. Process Scanned PDF File (Upload)
Process a local PDF file by uploading it directly as binary file data.

- **Endpoint**: `POST /api/v1/process`
- **Headers**:
  - `Authorization: Bearer YOUR_API_KEY`
- **Request Body**: Multipart Form Data (`multipart/form-data`) with the field:
  - `file`: (binary file selector pointing to the local `.pdf` file, up to 50MB)

- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "order": {
      "id": 43,
      "filename": "scanned_invoice.pdf",
      "status": "processing",
      "original_pdf_url": "https://pdf-seo-platform.onrender.com/api/download?file=original_456_scanned_invoice.pdf",
      "status_check_url": "https://pdf-seo-platform.onrender.com/api/v1/status/43",
      "created_at": "2026-06-24T05:02:00Z"
    }
  }
  ```

---

### 3. Check Processing Status
Get the real-time status of a submitted document. Once completed, the download link for the searchable output PDF will be populated.

- **Endpoint**: `GET /api/v1/status/:id`
- **Headers**:
  - `Authorization: Bearer YOUR_API_KEY`

- **Response (While Processing)**:
  ```json
  {
    "id": 42,
    "original_filename": "financial-report.pdf",
    "status": "processing",
    "created_at": "2026-06-24T05:00:00Z",
    "original_pdf_url": "https://pdf-seo-platform.onrender.com/api/download?file=original_123_financial-report.pdf",
    "searchable_pdf_url": null
  }
  ```

- **Response (Successfully Completed)**:
  ```json
  {
    "id": 42,
    "original_filename": "financial-report.pdf",
    "status": "completed",
    "created_at": "2026-06-24T05:00:00Z",
    "original_pdf_url": "https://pdf-seo-platform.onrender.com/api/download?file=original_123_financial-report.pdf",
    "searchable_pdf_url": "https://pdf-seo-platform.onrender.com/api/download?file=optimized_123_financial-report.pdf"
  }
  ```

- **Response (Failed)**:
  ```json
  {
    "id": 42,
    "original_filename": "financial-report.pdf",
    "status": "failed",
    "created_at": "2026-06-24T05:00:00Z",
    "original_pdf_url": "https://pdf-seo-platform.onrender.com/api/download?file=original_123_financial-report.pdf",
    "searchable_pdf_url": null
  }
  ```

---

### 4. Get Available Files (History)
Retrieve a history list of all documents (both processing and completed) processed on your account.

- **Endpoint**: `GET /api/v1/files`
- **Headers**:
  - `Authorization: Bearer YOUR_API_KEY`

- **Response (200 OK)**:
  ```json
  {
    "files": [
      {
        "id": 43,
        "original_filename": "scanned_invoice.pdf",
        "status": "processing",
        "created_at": "2026-06-24T05:02:00Z",
        "original_pdf_url": "https://pdf-seo-platform.onrender.com/api/download?file=original_456_scanned_invoice.pdf",
        "searchable_pdf_url": null
      },
      {
        "id": 42,
        "original_filename": "financial-report.pdf",
        "status": "completed",
        "created_at": "2026-06-24T05:00:00Z",
        "original_pdf_url": "https://pdf-seo-platform.onrender.com/api/download?file=original_123_financial-report.pdf",
        "searchable_pdf_url": "https://pdf-seo-platform.onrender.com/api/download?file=optimized_123_financial-report.pdf"
      }
    ]
  }
  ```

---

## 💻 Integration Examples

### Curl

#### Submit PDF via URL
```bash
curl -X POST "https://pdf-seo-platform.onrender.com/api/v1/process-url" \
  -H "Authorization: Bearer ds_live_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/sample.pdf"
  }'
```

#### Upload Local PDF file
```bash
curl -X POST "https://pdf-seo-platform.onrender.com/api/v1/process" \
  -H "Authorization: Bearer ds_live_YOUR_API_KEY" \
  -F "file=@/path/to/my_scanned_doc.pdf"
```

#### Check Status
```bash
curl -X GET "https://pdf-seo-platform.onrender.com/api/v1/status/42" \
  -H "Authorization: Bearer ds_live_YOUR_API_KEY"
```

---

### Python

```python
import requests
import time

API_KEY = "ds_live_YOUR_API_KEY"
BASE_URL = "https://pdf-seo-platform.onrender.com/api/v1"

headers = {
    "Authorization": f"Bearer {API_KEY}"
}

# 1. Process a URL
payload = {
    "url": "https://arxiv.org/pdf/1706.03762.pdf" # Attention Is All You Need paper
}

print("Submitting PDF URL...")
response = requests.post(f"{BASE_URL}/process-url", json=payload, headers=headers)
order = response.json().get("order", {})
order_id = order.get("id")

print(f"Submitted successfully! Order ID: {order_id}")

# 2. Poll status until completed
while True:
    status_response = requests.get(f"{BASE_URL}/status/{order_id}", headers=headers)
    status_data = status_response.json()
    status = status_data.get("status")
    
    print(f"Current status: {status}")
    if status == "completed":
        print(f"Success! Download searchable PDF here: {status_data.get('searchable_pdf_url')}")
        break
    elif status == "failed":
        print("Processing failed.")
        break
        
    time.sleep(5)
```

---

### Node.js

```javascript
const API_KEY = 'ds_live_YOUR_API_KEY';
const BASE_URL = 'https://pdf-seo-platform.onrender.com/api/v1';

async function processPdf(pdfUrl) {
  try {
    // 1. Submit PDF URL
    const response = await fetch(`${BASE_URL}/process-url`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: pdfUrl })
    });
    
    const data = await response.json();
    const orderId = data.order.id;
    console.log(`Order created with ID: ${orderId}`);
    
    // 2. Poll status
    const checkInterval = setInterval(async () => {
      const statusRes = await fetch(`${BASE_URL}/status/${orderId}`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` }
      });
      const statusData = await statusRes.json();
      
      console.log(`Status: ${statusData.status}`);
      if (statusData.status === 'completed') {
        clearInterval(checkInterval);
        console.log(`Download finished PDF: ${statusData.searchable_pdf_url}`);
      } else if (statusData.status === 'failed') {
        clearInterval(checkInterval);
        console.log('Processing failed.');
      }
    }, 5000);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

processPdf('https://example.com/scanned_document.pdf');
```
