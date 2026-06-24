'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { supabaseBrowser } from '@/lib/supabase-browser';
import styles from './page.module.css';

/* ── Types ──────────────────────────────────── */
interface ProcessedPdf {
  id: number;
  original_filename: string;
  b2_url: string | null;
  original_b2_url: string | null;
  status: string;
  created_at: string;
  user_id: string | null;
}

/* ── Helpers ────────────────────────────────── */
function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;

  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '...' : str;
}

/* ── Dashboard Content ──────────────────────── */
function DashboardContent() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload card state
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Recent PDFs
  const [pdfs, setPdfs] = useState<ProcessedPdf[]>([]);
  const [pdfsLoading, setPdfsLoading] = useState(true);

  // Auth guard
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  // Fetch recent PDFs
  const fetchPdfs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabaseBrowser
      .from('processed_pdfs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setPdfs((data as ProcessedPdf[]) || []);
    setPdfsLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchPdfs();
    }
  }, [user, fetchPdfs]);

  // Auto-refresh: Poll if any items are in 'processing' status
  useEffect(() => {
    const hasProcessing = pdfs.some((pdf) => pdf.status === 'processing');
    if (hasProcessing) {
      const interval = setInterval(() => {
        fetchPdfs();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [pdfs, fetchPdfs]);

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
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (user?.id) formData.append('userId', user.id);

      const res = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Processing failed');
      
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSuccessMessage('PDF submitted successfully! You can track progress in the history below.');
      
      // Instantly refresh list to show the 'processing' order card
      await fetchPdfs();
    } catch {
      setErrorMessage('Failed to submit PDF. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Process URL
  const processUrl = async () => {
    if (!url.trim()) return;
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/process-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), userId: user?.id || null }),
      });

      if (!res.ok) throw new Error('Processing failed');
      
      setUrl('');
      setSuccessMessage('URL submitted successfully! You can track progress in the history below.');
      
      // Instantly refresh list to show the 'processing' order card
      await fetchPdfs();
    } catch {
      setErrorMessage('Failed to process PDF from URL. Please check the URL and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className={styles.page}>
      {/* ── Navbar ─────────────────── */}
      <nav className={styles.navbar}>
        <a href="/" className={styles.logo}>DocuSEO</a>
        <div className={styles.navRight}>
          <span className={styles.userEmail}>{user.email}</span>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      <div className={styles.content}>
        {/* ── Welcome ───────────────── */}
        <section className={styles.welcomeSection}>
          <h1 className={styles.greeting}>Welcome back!</h1>
          <p className={styles.greetingSub}>
            Upload a PDF or paste a URL to make it searchable.
          </p>
        </section>

        {/* ── Upload Card ───────────── */}
        <div className={styles.uploadCard}>
          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'file' ? styles.tabActive : ''}`}
              disabled={submitting}
              onClick={() => {
                setActiveTab('file');
                setErrorMessage('');
                setSuccessMessage('');
              }}
            >
              📁 Upload File
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'url' ? styles.tabActive : ''}`}
              disabled={submitting}
              onClick={() => {
                setActiveTab('url');
                setErrorMessage('');
                setSuccessMessage('');
              }}
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
                onClick={() => !submitting && fileInputRef.current?.click()}
                style={{ cursor: submitting ? 'not-allowed' : 'pointer' }}
              >
                <input
                  type="file"
                  accept=".pdf"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  disabled={submitting}
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
                disabled={!file || submitting}
                onClick={processFile}
              >
                {submitting ? 'Submitting PDF...' : 'Process PDF'}
              </button>
            </>
          ) : (
            <div className={styles.urlInputContainer}>
              <input
                type="url"
                className={styles.urlInput}
                placeholder="https://example.com/document.pdf"
                value={url}
                disabled={submitting}
                onChange={(e) => setUrl(e.target.value)}
              />
              <button
                className={styles.processBtn}
                disabled={!url.trim() || submitting}
                onClick={processUrl}
              >
                {submitting ? 'Submitting URL...' : 'Process URL'}
              </button>
            </div>
          )}

          {errorMessage && (
            <div className={styles.errorMsg}>{errorMessage}</div>
          )}

          {successMessage && (
            <div style={{
              marginTop: '0.75rem',
              padding: '0.7rem 1rem',
              borderRadius: '10px',
              backgroundColor: 'rgba(52,211,153,0.1)',
              border: '1px solid rgba(52,211,153,0.2)',
              color: '#a7f3d0',
              fontSize: '0.85rem'
            }}>
              {successMessage}
            </div>
          )}
        </div>

        {/* ── Recent PDFs / History ──── */}
        <section className={styles.recentSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Your Processed PDFs</h2>
            {pdfs.length > 0 && (
              <span className={styles.countBadge}>{pdfs.length}</span>
            )}
          </div>

          {pdfsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <div className={styles.spinner} />
            </div>
          ) : pdfs.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📭</span>
              <p className={styles.emptyText}>
                No PDFs processed yet. Upload your first PDF above!
              </p>
            </div>
          ) : (
            <div className={styles.pdfGrid}>
              {pdfs.map((pdf) => (
                <div
                  key={pdf.id}
                  className={styles.pdfCard}
                  onClick={() => router.push(`/dashboard/${pdf.id}`)}
                >
                  <span className={styles.pdfCardIcon}>📄</span>
                  <p className={styles.pdfCardFilename}>
                    {truncate(pdf.original_filename, 30)}
                  </p>
                  <div className={styles.pdfCardMeta}>
                    <span className={styles.pdfCardTime}>
                      {relativeTime(pdf.created_at)}
                    </span>
                    
                    {pdf.status === 'processing' ? (
                      <span className={`${styles.statusBadge} ${styles.badgeProcessing}`}>
                        ⚙ Processing...
                      </span>
                    ) : pdf.status === 'failed' ? (
                      <span className={`${styles.statusBadge} ${styles.badgeFailed}`}>
                        ❌ Failed
                      </span>
                    ) : (
                      <span className={`${styles.statusBadge} ${styles.badgeCompleted}`}>
                        Ready ✓
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ── Page Export (wrapped in AuthProvider) ─── */
export default function DashboardPage() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
