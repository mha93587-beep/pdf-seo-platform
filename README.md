<div align="center">
  <img src="https://img.shields.io/badge/Next.js-Black?style=for-the-badge&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/PyMuPDF-000000?style=for-the-badge&logo=pdf&logoColor=white" />
  <img src="https://img.shields.io/badge/AI_OCR-FF6B6B?style=for-the-badge&logo=google-gemini&logoColor=white" />
</div>

<h1 align="center">PDF SEO Platform: Make Any PDF Searchable & Selectable</h1>

<p align="center">
  <strong>The ultimate open-source solution for converting scanned, image-based PDFs into perfectly searchable and selectable PDFs using state-of-the-art AI OCR (Datalab Marker API).</strong>
</p>

<div align="center">
  <h3>🚀 <a href="https://pdf-seo-platform.onrender.com/">Try the Live Demo Here</a> 🚀</h3>
</div>

## 👀 Preview the Magic (Original vs Searchable)

Test it yourself! Open the PDFs below and try to select/copy the complex text.

### 📐 Complex Mathematics (Determinants & Integrals)
- ❌ **Original (Flat Image):** [Download `original_maths.pdf`](https://github.com/mha93587-beep/pdf-seo-platform/raw/main/examples/original_maths.pdf)
- ✅ **Searchable (Raw LaTeX Embedded):** [Download `searchable_maths.pdf`](https://github.com/mha93587-beep/pdf-seo-platform/raw/main/examples/searchable_maths.pdf) *(Try selecting a matrix!)*

### 🇨🇳 Chinese Typography
- ❌ **Original (Flat Image):** [Download `original_chinese.pdf`](https://github.com/mha93587-beep/pdf-seo-platform/raw/main/examples/original_chinese.pdf)
- ✅ **Searchable (Perfect CJK Extraction):** [Download `searchable_chinese.pdf`](https://github.com/mha93587-beep/pdf-seo-platform/raw/main/examples/searchable_chinese.pdf)

<hr/>

## ✨ Features

- **Perfect Searchable & Selectable PDF (AI OCR):** Converts completely flat, image-based scanned PDFs into interactive documents. Users can search for text, copy paragraphs, and index content.
- **Flawless Mathematical Equations (LaTeX):** Unlike traditional OCR that corrupts equations, this platform identifies Integrals, Determinants, and Matrices, and embeds them invisibly as **raw LaTeX**. Selecting an equation allows you to copy its exact LaTeX code!
- **Extensive Multilingual & CJK Support:** Native integration of massive fonts (FreeSerif, NotoSansSC, HeiseiMin, etc.) guarantees 100% accurate embedding of Chinese, Japanese, Korean, Hindi, and more.
- **Production-Ready Architecture:** Built with a blazing-fast **Next.js 14 App Router** frontend and a robust **Python 3 / PyMuPDF** backend script.
- **Cloud Storage Integration:** Automatically uploads processed PDFs to **Backblaze B2** and generates expiring Signed URLs for secure downloads.
- **Supabase DB:** Logs all jobs, user IPs, and processed files for analytics.

## 🏆 Why This Repo? (SEO & Keywords)
If you are looking for *Searchable PDF generator, Selectable PDF creator, AI PDF OCR, PDF Math/LaTeX Extraction, Next.js PDF Processing, PyMuPDF overlay, or an open-source Mathpix alternative*, you have found the right place! This repository perfectly aligns the visual page with an invisible text layer with pixel-perfect accuracy.

---

## 🛠️ Tech Stack
- **Frontend:** Next.js (App Router), Tailwind CSS, Framer Motion
- **Backend (API):** Next.js Serverless Routes
- **PDF Engine:** Python 3, PyMuPDF (fitz), BeautifulSoup4
- **AI OCR:** Datalab Marker API
- **Storage:** Backblaze B2 (S3 API)
- **Database:** Supabase (PostgreSQL)

---

## 💻 Local Setup & Installation

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (v3.11+)

### 2. Clone the Repository
```bash
git clone https://github.com/mha93587-beep/pdf-seo-platform.git
cd pdf-seo-platform
```

### 3. Install Dependencies
```bash
# Install Node modules
npm install

# Install Python dependencies
pip install -r requirements.txt
```
*(Note: A `.python-version` file is included to strictly use Python 3.11.9 for pre-compiled PyMuPDF wheels, avoiding long build times).*

### 4. Environment Variables
Create a `.env` file in the root directory and add the following keys:
```env
# Datalab API Key for AI OCR
DATALAB_MARKER_API=your_datalab_api_key

# Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backblaze B2 (S3 Compatible Storage)
B2_APPLICATION_KEY_ID=your_b2_key_id
B2_APPLICATION_KEY=your_b2_application_key
B2_BUCKET_NAME=your_b2_bucket_name
```

### 5. Run the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ How to Deploy on Render

Deploying this app to production is incredibly easy.

1. Go to [Render.com](https://render.com/) and create a new **Web Service**.
2. Connect your GitHub repository.
3. Configure the settings as follows:
   - **Environment:** `Node`
   - **Build Command:** `npm install && pip install -r requirements.txt && npm run build`
   - **Start Command:** `npm start`
4. Expand the **Environment Variables** section and add all the keys from your `.env` file (`DATALAB_MARKER_API`, `NEXT_PUBLIC_SUPABASE_URL`, etc.).
5. Click **Deploy Web Service**!

Render will automatically detect the `.python-version` file, install Python 3.11, cache your dependencies, and spin up the Next.js production build.

---

## 🤝 Contributing
Contributions are always welcome! If you have any ideas to make this searchable PDF platform even better, feel free to open an issue or submit a pull request. Let's make this the #1 open-source PDF processing tool on GitHub!

## 📜 License
This project is licensed under the MIT License.
