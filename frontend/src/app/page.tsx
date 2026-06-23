'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'done'>('idle');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const processFile = async () => {
    if (!file) return;
    setStatus('uploading');

    try {
      const formData = new FormData();
      formData.append('file', file);

      // We will implement the actual API endpoint /api/process 
      // which will handle uploading to B2, triggering Marker, and saving to Supabase
      const res = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Processing failed');
      const data = await res.json();
      
      setResultUrl(data.downloadUrl || '#');
      setStatus('done');
    } catch (error) {
      console.error(error);
      setStatus('idle');
      alert('Error processing PDF. Please try again.');
    }
  };

  return (
    <div className="container">
      <header className="header slide-up">
        <div className="logo">
          <div className="logo-icon">
             <Image src="/logo.jpg" alt="DocuSEO Logo" width={40} height={40} />
          </div>
          DocuSEO
        </div>
        <nav>
          <button className="btn" style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}>
            Login
          </button>
        </nav>
      </header>

      <main className="hero fade-in">
        <h1>Make your PDFs <br/> <span style={{ color: '#38bdf8' }}>100% Searchable</span></h1>
        <p>
          Boost your SEO by making your PDF documents completely indexable by Google.
          Our smart AI extracts text perfectly and embeds it without duplicating existing content.
        </p>

        <section className="upload-section">
          <div 
            className={`glass-panel upload-box ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              accept=".pdf" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            
            <div className="upload-icon">
              {status === 'idle' && '📄'}
              {(status === 'uploading' || status === 'processing') && <div className="loader"></div>}
              {status === 'done' && '✅'}
            </div>
            
            <h2 className="upload-text">
              {file ? file.name : 'Drag & Drop your PDF here'}
            </h2>
            <p className="upload-subtext">
              {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'or click to browse from your computer'}
            </p>
          </div>

          {file && status === 'idle' && (
            <div style={{ marginTop: '2rem' }} className="slide-up">
              <button className="btn" onClick={(e) => { e.stopPropagation(); processFile(); }}>
                Optimize PDF Now
              </button>
            </div>
          )}

          {(status === 'uploading' || status === 'processing') && (
            <div style={{ marginTop: '2rem' }} className="slide-up">
              <p style={{ color: '#38bdf8', fontWeight: 500 }}>
                {status === 'uploading' ? 'Uploading to secure storage...' : 'AI is processing and optimizing...'}
              </p>
            </div>
          )}

          {status === 'done' && (
            <div className="results-section slide-up">
              <div className="glass-panel result-card">
                <div className="result-info">
                  <div className="file-icon">✨</div>
                  <div className="file-details">
                    <h3>Optimized: {file?.name}</h3>
                    <p>Ready for Google Indexing</p>
                  </div>
                </div>
                <a href={resultUrl || '#'} className="btn" style={{ textDecoration: 'none' }} download>
                  Download SEO PDF
                </a>
              </div>
              <button 
                onClick={() => { setFile(null); setStatus('idle'); setResultUrl(null); }}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', marginTop: '1rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Process another file
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
