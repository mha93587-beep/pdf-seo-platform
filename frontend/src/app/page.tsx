'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import styles from './page.module.css';

/* ─── Data ─── */
const FEATURES = [
  {
    emoji: '🔍',
    title: 'Perfect Text Extraction',
    desc: 'AI-powered OCR extracts every word with pixel-perfect accuracy from any scanned document.',
  },
  {
    emoji: '📐',
    title: 'LaTeX Math Support',
    desc: 'Determinants, integrals, matrices — all preserved as searchable raw LaTeX code. Perfect for academic papers.',
  },
  {
    emoji: '🌏',
    title: 'Multilingual Support',
    desc: 'Chinese, Japanese, Korean, Hindi, Arabic — over 50 languages supported with dedicated font engines.',
  },
  {
    emoji: '⚡',
    title: 'Lightning Fast',
    desc: 'Process multi-page PDFs in seconds with our optimized AI pipeline. No waiting around.',
  },
  {
    emoji: '🔒',
    title: 'Secure & Private',
    desc: 'Your files are encrypted in transit and at rest. We take your privacy seriously.',
  },
  {
    emoji: '📈',
    title: 'SEO Optimized',
    desc: 'Make your PDFs fully indexable by Google, Bing, and all major search engines instantly.',
  },
];

const STEPS = [
  {
    num: 1,
    title: 'Upload Your PDF',
    desc: 'Drag and drop or paste a URL — we accept any PDF file up to 50MB.',
  },
  {
    num: 2,
    title: 'AI Processes It',
    desc: 'Our Marker AI engine extracts text, equations, and CJK characters with precision.',
  },
  {
    num: 3,
    title: 'Download Result',
    desc: 'Get your perfectly searchable PDF — every word selectable and copyable.',
  },
];

const FAQS = [
  {
    q: 'What types of PDFs can I process?',
    a: 'DocuSEO works with any PDF — scanned documents, image-based PDFs, photographed pages, and more. If it is a PDF, we can make it searchable.',
  },
  {
    q: 'How does math equation extraction work?',
    a: 'We use the Datalab Marker API to identify mathematical content and preserve it as raw LaTeX code. When you select a matrix or integral, you get the exact LaTeX — perfect for pasting into ChatGPT, Overleaf, or Word.',
  },
  {
    q: 'Which languages are supported?',
    a: 'Over 50 languages including English, Hindi, Chinese (Simplified & Traditional), Japanese, Korean, Arabic, Russian, and all major European languages.',
  },
  {
    q: 'Is my data secure?',
    a: 'Absolutely. Files are processed in isolated environments and stored in encrypted cloud storage. You can delete your files anytime.',
  },
  {
    q: 'Is DocuSEO free?',
    a: 'Yes! DocuSEO is completely free to use with no limits on the number of PDFs you can process.',
  },
  {
    q: 'Can I process PDFs via URL?',
    a: 'Yes! Paste any publicly accessible PDF URL and we will fetch and process it — no download needed on your end.',
  },
];

const STATUS_MESSAGES = [
  '🧠 AI is analyzing your document...',
  '📐 Extracting mathematical equations...',
  '🔤 Recognizing multilingual text...',
  '✨ Embedding invisible search layer...',
  '🎯 Optimizing for perfection...',
];

/* ─── Helpers ─── */
function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

/* ─── Component ─── */
export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload state
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Processing animation
  const [statusMsgIndex, setStatusMsgIndex] = useState(0);
  const [statusFading, setStatusFading] = useState(false);

  // Rotating status messages during processing
  useEffect(() => {
    if (status !== 'processing') return;
    const interval = setInterval(() => {
      setStatusFading(true);
      setTimeout(() => {
        setStatusMsgIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
        setStatusFading(false);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, [status]);

  // Drag & drop handlers
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
    if (e.dataTransfer.files?.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf' || droppedFile.name.endsWith('.pdf')) {
        setFile(droppedFile);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setFile(e.target.files[0]);
    }
  };

  // Process file upload
  const processFile = async () => {
    if (!file) return;
    setStatus('processing');
    setErrorMessage('');
    setStatusMsgIndex(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (user?.id) formData.append('userId', user.id);

      const res = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Processing failed');
      const data = await res.json();
      setDownloadUrl(data.downloadUrl);
      setStatus('done');
    } catch {
      setStatus('error');
      setErrorMessage('Failed to process PDF. Please try again.');
    }
  };

  // Process URL
  const processUrl = async () => {
    if (!url.trim()) return;
    setStatus('processing');
    setErrorMessage('');
    setStatusMsgIndex(0);

    try {
      const res = await fetch('/api/process-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), userId: user?.id || null }),
      });

      if (!res.ok) throw new Error('Processing failed');
      const data = await res.json();
      setDownloadUrl(data.downloadUrl);
      setStatus('done');
    } catch {
      setStatus('error');
      setErrorMessage('Failed to process PDF from URL. Please check the URL and try again.');
    }
  };

  // Reset state
  const resetState = () => {
    setFile(null);
    setUrl('');
    setStatus('idle');
    setDownloadUrl(null);
    setErrorMessage('');
    setStatusMsgIndex(0);
  };

  return (
    <>
      {/* ───────── Navbar ───────── */}
      <nav className={styles.navbar} id="navbar">
        <div className={styles.navbar__inner}>
          <span className={styles.navbar__logo}>DocuSEO</span>

          <div className={styles.navbar__links}>
            <button className={styles.navbar__link} onClick={() => scrollTo('features')}>
              Features
            </button>
            <button className={styles.navbar__link} onClick={() => scrollTo('how-it-works')}>
              How It Works
            </button>
            <button className={styles.navbar__link} onClick={() => scrollTo('faq')}>
              FAQ
            </button>
          </div>

          <div className={styles.navbar__actions}>
            {user ? (
              <Link href="/dashboard" className={`${styles.navbar__btn} ${styles['navbar__btn--cta']}`}>
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/auth" className={`${styles.navbar__btn} ${styles['navbar__btn--login']}`}>
                  Login
                </Link>
                <Link href="/auth" className={`${styles.navbar__btn} ${styles['navbar__btn--cta']}`}>
                  Get Started
                </Link>
              </>
            )}
          </div>

          <button
            className={styles['navbar__mobile-toggle']}
            aria-label="Toggle navigation"
            onClick={() => {
              /* For now just scrolls to features on mobile as a simple fallback */
              scrollTo('features');
            }}
          >
            ☰
          </button>
        </div>
      </nav>

      {/* ───────── Hero ───────── */}
      <section className={styles.hero} id="hero">
        {/* Background orbs */}
        <div className={`${styles.hero__orb} ${styles['hero__orb--blue']}`} />
        <div className={`${styles.hero__orb} ${styles['hero__orb--purple']}`} />
        <div className={`${styles.hero__orb} ${styles['hero__orb--orange']}`} />

        <div className={styles.hero__content}>
          <h1 className={styles.hero__heading}>
            Transform Any PDF into a
            <span className={styles['hero__heading-gradient']}>Searchable Masterpiece</span>
          </h1>

          <p className={styles.hero__subtitle}>
            Our AI reads every page — from complex mathematical equations to Chinese characters —
            and makes your PDFs 100% searchable, selectable, and SEO-ready.
          </p>

          {/* Upload card inside the Hero section! */}
          <div className={styles.uploadCard}>
            {status === 'idle' || status === 'error' ? (
              <>
                {/* Tabs */}
                <div className={styles.tabs}>
                  <button
                    className={`${styles.tab} ${activeTab === 'file' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('file')}
                  >
                    📁 Upload File
                  </button>
                  <button
                    className={`${styles.tab} ${activeTab === 'url' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('url')}
                  >
                    🔗 Paste URL
                  </button>
                </div>

                {activeTab === 'file' ? (
                  <>
                    <div
                      className={`${styles.dropZone} ${isDragging ? styles.dropZoneDragging : ''} ${file ? styles.fileSelected : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        accept=".pdf"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className={styles.hiddenInput}
                      />
                      <span className={styles.dropIcon}>
                        {file ? '📄' : '📂'}
                      </span>
                      <p className={styles.dropTitle}>
                        {file ? file.name : 'Drag & Drop your PDF here'}
                      </p>
                      <p className={styles.dropSubtext}>
                        {file
                          ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                          : 'or click to browse from your computer'}
                      </p>
                      {file && (
                        <p className={styles.fileName}>
                          ✓ File selected
                        </p>
                      )}
                    </div>
                    <button
                      className={styles.processBtn}
                      disabled={!file}
                      onClick={processFile}
                    >
                      Process PDF
                    </button>
                  </>
                ) : (
                  <div className={styles.urlInputContainer}>
                    <input
                      type="url"
                      className={styles.urlInput}
                      placeholder="https://example.com/document.pdf"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                    <button
                      className={styles.processBtn}
                      disabled={!url.trim()}
                      onClick={processUrl}
                    >
                      Process URL
                    </button>
                  </div>
                )}

                {status === 'error' && errorMessage && (
                  <div className={styles.errorMsg}>{errorMessage}</div>
                )}
              </>
            ) : status === 'processing' ? (
              /* ── Processing Animation ── */
              <div className={styles.processingContainer}>
                <div className={styles.processingGlow} />
                <div className={styles.pulseRingContainer}>
                  <div className={styles.pulseRing} />
                  <div className={styles.pulseRing} />
                  <div className={styles.pulseRing} />
                  <span className={styles.brainEmoji}>🧠</span>
                </div>
                <p
                  className={`${styles.statusText} ${
                    statusFading ? styles.statusTextFading : styles.statusTextVisible
                  }`}
                >
                  {STATUS_MESSAGES[statusMsgIndex]}
                </p>
                <div className={styles.shimmerBar}>
                  <div className={styles.shimmerBarInner} />
                </div>
              </div>
            ) : status === 'done' ? (
              /* ── Success State ────────── */
              <div className={styles.successContainer}>
                <span className={styles.successIcon}>✅</span>
                <h2 className={styles.successTitle}>Your PDF is ready!</h2>
                <p className={styles.successSub}>
                  Your document has been enhanced with an invisible searchable text layer.
                </p>
                <div className={styles.successActions}>
                  <a
                    href={downloadUrl || '#'}
                    className={styles.downloadBtn}
                    download
                  >
                    ⬇ Download Searchable PDF
                  </a>
                  <button className={styles.resetBtn} onClick={resetState}>
                    Process Another
                  </button>
                </div>
                {!user && (
                  <p className={styles.savePrompt}>
                    Want to save this file to your history?{' '}
                    <Link href="/auth" className={styles.saveLink}>
                      Create a free account
                    </Link>
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* ───────── Features ───────── */}
      <section className={styles.features} id="features">
        <div className={styles.container}>
          <h2 className={styles.section__heading}>Why Choose DocuSEO?</h2>
          <p className={styles.section__subheading}>
            Everything you need to make your PDFs discoverable
          </p>

          <div className={styles.features__grid}>
            {FEATURES.map((f) => (
              <div className={styles.features__card} key={f.title}>
                <span className={styles.features__emoji}>{f.emoji}</span>
                <h3 className={styles.features__title}>{f.title}</h3>
                <p className={styles.features__desc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── How It Works ───────── */}
      <section className={styles.howItWorks} id="how-it-works">
        <div className={styles.container}>
          <h2 className={styles.section__heading}>How It Works</h2>
          <p className={styles.section__subheading}>Three simple steps to searchable PDFs</p>

          <div className={styles.howItWorks__steps}>
            {STEPS.map((s, i) => (
              <div
                className={`${styles.howItWorks__step} ${
                  i < STEPS.length - 1 ? styles['howItWorks__step--connected'] : ''
                }`}
                key={s.num}
              >
                <div className={styles.howItWorks__number}>{s.num}</div>
                <h3 className={styles.howItWorks__title}>{s.title}</h3>
                <p className={styles.howItWorks__desc}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section className={styles.faq} id="faq">
        <div className={styles.container}>
          <h2 className={styles.section__heading}>Frequently Asked Questions</h2>
          <p className={styles.section__subheading}>Got questions? We have answers.</p>

          <div className={styles.faq__list}>
            {FAQS.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div className={styles.faq__item} key={i}>
                  <button
                    className={styles.faq__question}
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                  >
                    {item.q}
                    <span
                      className={`${styles.faq__arrow} ${isOpen ? styles['faq__arrow--open'] : ''}`}
                    >
                      ▼
                    </span>
                  </button>
                  <div
                    className={`${styles.faq__answer} ${isOpen ? styles['faq__answer--open'] : ''}`}
                  >
                    <p className={styles['faq__answer-text']}>{item.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────── Footer ───────── */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footer__logo}>DocuSEO</div>
          <p className={styles.footer__tagline}>Making PDFs searchable with AI</p>

          <div className={styles.footer__links}>
            <a
              href="https://github.com/mha93587-beep/pdf-seo-platform"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footer__link}
            >
              GitHub
            </a>
            <Link href="/dashboard" className={styles.footer__link}>
              Dashboard
            </Link>
          </div>

          <p className={styles.footer__copy}>© 2024 DocuSEO. Made with ❤️</p>
        </div>
      </footer>
    </>
  );
}
