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

interface ApiKey {
  id: number;
  name: string;
  api_key: string;
  created_at: string;
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

  // View toggle: 'process' (Upload & history) or 'api' (API Key & Docs)
  const [currentView, setCurrentView] = useState<'process' | 'api'>('process');

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

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [keyError, setKeyError] = useState('');
  const [keySuccess, setKeySuccess] = useState('');

  // Host origin for documentation (default fallback is origin if client side)
  const [originUrl, setOriginUrl] = useState('https://pdf-seo-platform.onrender.com');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOriginUrl(window.location.origin);
    }
  }, []);

  // Doc tab selection: 'curl' | 'node' | 'python'
  const [docTab, setDocTab] = useState<'curl' | 'node' | 'python'>('curl');

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

  // Fetch API Keys
  const fetchApiKeys = useCallback(async () => {
    if (!user) return;
    setApiKeysLoading(true);
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const res = await fetch('/api/keys', {
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`,
        }
      });
      const resData = await res.json();
      if (res.ok) {
        setApiKeys(resData.keys || []);
      } else {
        setKeyError(resData.error || 'Failed to fetch API keys');
      }
    } catch {
      setKeyError('Network error fetching API keys');
    } finally {
      setApiKeysLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchPdfs();
      fetchApiKeys();
    }
  }, [user, fetchPdfs, fetchApiKeys]);

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
      
      await fetchPdfs();
    } catch {
      setErrorMessage('Failed to process PDF from URL. Please check the URL and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Create API Key
  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setKeyError('');
    setGeneratedKey(null);
    setKeySuccess('');

    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const resData = await res.json();
      if (res.ok) {
        setGeneratedKey(resData.key.api_key);
        setNewKeyName('');
        setKeySuccess('API Key created successfully! Copy it now; you won\'t be able to see it again.');
        fetchApiKeys();
      } else {
        setKeyError(resData.error || 'Failed to create key');
      }
    } catch {
      setKeyError('Network error creating API Key');
    }
  };

  // Delete API Key
  const handleDeleteApiKey = async (id: number) => {
    if (!confirm('Are you sure you want to revoke this API Key? Any application using it will lose access immediately.')) {
      return;
    }
    setKeyError('');
    setGeneratedKey(null);
    setKeySuccess('');

    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const res = await fetch(`/api/keys?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`,
        }
      });
      if (res.ok) {
        setKeySuccess('API Key revoked successfully.');
        fetchApiKeys();
      } else {
        const resData = await res.json();
        setKeyError(resData.error || 'Failed to revoke key');
      }
    } catch {
      setKeyError('Network error revoking API Key');
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
        {/* ── Welcome & Navigation Switcher ───────────────── */}
        <section className={styles.welcomeSection}>
          <h1 className={styles.greeting}>Welcome back!</h1>
          <p className={styles.greetingSub}>
            Make PDFs searchable locally or integrate our API directly into your workflows.
          </p>

          <div style={{
            display: 'flex',
            gap: '1rem',
            marginTop: '2rem',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            paddingBottom: '0.75rem'
          }}>
            <button
              onClick={() => setCurrentView('process')}
              style={{
                background: 'none',
                border: 'none',
                color: currentView === 'process' ? '#38bdf8' : 'rgba(255,255,255,0.4)',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '0.5rem 0',
                borderBottom: currentView === 'process' ? '2px solid #38bdf8' : 'none',
                transition: 'all 0.2s'
              }}
            >
              🚀 Process Files
            </button>
            <button
              onClick={() => setCurrentView('api')}
              style={{
                background: 'none',
                border: 'none',
                color: currentView === 'api' ? '#38bdf8' : 'rgba(255,255,255,0.4)',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '0.5rem 0',
                borderBottom: currentView === 'api' ? '2px solid #38bdf8' : 'none',
                transition: 'all 0.2s'
              }}
            >
              🔑 Developer API & Docs
            </button>
          </div>
        </section>

        {currentView === 'process' ? (
          /* =========================================================
             1. PROCESS FILES VIEW (Dashboard Upload Panel)
             ========================================================= */
          <>
            {/* Upload Card */}
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

            {/* Recent PDFs / History */}
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
          </>
        ) : (
          /* =========================================================
             2. DEVELOPER API KEYS & DOCUMENTATION VIEW
             ========================================================= */
          <div style={{ padding: '2rem 0 5rem', animation: 'fadeInUp 0.5s ease both' }}>
            
            {/* API Keys Management Card */}
            <div style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: '16px',
              padding: '2rem',
              marginBottom: '2.5rem',
              backdropFilter: 'blur(12px)'
            }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>Your API Keys</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Generate API keys to integrate DocuSEO text extraction directly into your custom applications.
              </p>

              {/* Form to create new key */}
              <form onSubmit={handleCreateApiKey} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Key name (e.g. My Production App)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: '250px',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(255,255,255,0.03)',
                    color: '#fff',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={!newKeyName.trim()}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '10px',
                    background: 'var(--accent-gradient)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: newKeyName.trim() ? 'pointer' : 'not-allowed',
                    opacity: newKeyName.trim() ? 1 : 0.6
                  }}
                >
                  Generate Key
                </button>
              </form>

              {/* Error & Success Messages */}
              {keyError && (
                <div className={styles.errorMsg} style={{ marginBottom: '1.5rem' }}>{keyError}</div>
              )}

              {keySuccess && (
                <div style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(52,211,153,0.1)',
                  border: '1px solid rgba(52,211,153,0.2)',
                  color: '#a7f3d0',
                  fontSize: '0.88rem',
                  marginBottom: '1.5rem'
                }}>
                  {keySuccess}
                </div>
              )}

              {/* Created Raw Key View (Shown only ONCE!) */}
              {generatedKey && (
                <div style={{
                  padding: '1.25rem',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(56,189,248,0.08)',
                  border: '1px dashed rgba(56,189,248,0.3)',
                  color: '#fff',
                  marginBottom: '2rem'
                }}>
                  <p style={{ fontWeight: 600, fontSize: '0.85rem', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    ⚠️ COPY YOUR API KEY NOW
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <code style={{
                      flex: 1,
                      padding: '0.6rem 0.8rem',
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      fontSize: '0.95rem',
                      overflowX: 'auto',
                      border: '1px solid rgba(255,255,255,0.06)'
                    }}>
                      {generatedKey}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedKey);
                        alert('API Key copied to clipboard!');
                      }}
                      style={{
                        padding: '0.6rem 1rem',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        cursor: 'pointer',
                        fontWeight: 500,
                        fontSize: '0.82rem'
                      }}
                    >
                      Copy
                    </button>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', marginTop: '0.5rem' }}>
                    For security reasons, this key will not be displayed again after you navigate away or refresh.
                  </p>
                </div>
              )}

              {/* API Keys List */}
              {apiKeysLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}>
                  <div className={styles.spinner} style={{ width: 30, height: 30 }} />
                </div>
              ) : apiKeys.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>
                  No API keys generated yet. Use the input above to create one.
                </p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    fontSize: '0.9rem'
                  }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <th style={{ padding: '0.75rem 0.5rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Name</th>
                        <th style={{ padding: '0.75rem 0.5rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>API Key</th>
                        <th style={{ padding: '0.75rem 0.5rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Created</th>
                        <th style={{ padding: '0.75rem 0.5rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiKeys.map((key) => (
                        <tr key={key.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>{key.name}</td>
                          <td style={{ padding: '1rem 0.5rem' }}><code style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)' }}>{key.api_key}</code></td>
                          <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>{formatDateLocal(key.created_at)}</td>
                          <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                            <button
                              onClick={() => handleDeleteApiKey(key.id)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.15)',
                                borderRadius: '6px',
                                color: '#fca5a5',
                                padding: '0.35rem 0.75rem',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                transition: 'all 0.2s'
                              }}
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Developer Documentation Section */}
            <div style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: '16px',
              padding: '2rem',
              backdropFilter: 'blur(12px)'
            }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>API Documentation</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                Integrate DocuSEO PDF processing into your applications using our REST API. Authenticate all requests by attaching your key in the header:
                <br />
                <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.4rem', borderRadius: '4px', margin: '0.5rem 0', display: 'inline-block', fontFamily: 'monospace' }}>
                  Authorization: Bearer YOUR_API_KEY
                </code> or <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.4rem', borderRadius: '4px', display: 'inline-block', fontFamily: 'monospace' }}>x-api-key: YOUR_API_KEY</code>
              </p>

              {/* Code Language Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                {(['curl', 'node', 'python'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setDocTab(lang)}
                    style={{
                      padding: '0.4rem 1rem',
                      borderRadius: '6px',
                      background: docTab === lang ? '#38bdf8' : 'rgba(255,255,255,0.04)',
                      border: 'none',
                      color: docTab === lang ? '#000' : 'rgba(255,255,255,0.6)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      textTransform: 'uppercase'
                    }}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              {/* Render Selected Doc Tab Snippets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                {/* 1. Process URL Endpoint */}
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#38bdf8', marginBottom: '0.5rem' }}>
                    1. Process PDF via URL <span style={{ fontSize: '0.75rem', background: 'rgba(56,189,248,0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px', marginLeft: '0.5rem' }}>POST /api/v1/process-url</span>
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Submit a public PDF file URL to make it searchable. The server uploads the original document to B2, schedules the text and equations extraction in the background, and returns the tracking order metadata immediately.
                  </p>
                  <pre style={{
                    padding: '1rem',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    overflowX: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    color: '#e2e8f0'
                  }}>
                    {getProcessUrlCode(docTab, originUrl)}
                  </pre>
                </div>

                {/* 2. Process File Upload Endpoint */}
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#38bdf8', marginBottom: '0.5rem' }}>
                    2. Process Scanned PDF File <span style={{ fontSize: '0.75rem', background: 'rgba(56,189,248,0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px', marginLeft: '0.5rem' }}>POST /api/v1/process</span>
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Process a local PDF file by sending it inside multipart/form-data. This handles direct file uploads asynchronously.
                  </p>
                  <pre style={{
                    padding: '1rem',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    overflowX: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    color: '#e2e8f0'
                  }}>
                    {getProcessFileCode(docTab, originUrl)}
                  </pre>
                </div>

                {/* 3. Check Status Endpoint */}
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#38bdf8', marginBottom: '0.5rem' }}>
                    3. Check Processing Status <span style={{ fontSize: '0.75rem', background: 'rgba(56,189,248,0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px', marginLeft: '0.5rem' }}>GET /api/v1/status/:id</span>
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Query the status of an uploaded PDF file by its ID. Once completed, the download link for the searchable output PDF is provided in the response payload.
                  </p>
                  <pre style={{
                    padding: '1rem',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    overflowX: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    color: '#e2e8f0'
                  }}>
                    {getStatusCode(docTab, originUrl)}
                  </pre>
                </div>

                {/* 4. List Files Endpoint */}
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#38bdf8', marginBottom: '0.5rem' }}>
                    4. Get Available Files (History) <span style={{ fontSize: '0.75rem', background: 'rgba(56,189,248,0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px', marginLeft: '0.5rem' }}>GET /api/v1/files</span>
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    List all documents (both processing and completed) mapped to your account credentials.
                  </p>
                  <pre style={{
                    padding: '1rem',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    overflowX: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    color: '#e2e8f0'
                  }}>
                    {getListFilesCode(docTab, originUrl)}
                  </pre>
                </div>

              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

/* ── Auxiliary Date Formatter ──────────────── */
function formatDateLocal(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/* ── Code Snippet Generation Functions ─────── */
function getProcessUrlCode(lang: string, origin: string): string {
  if (lang === 'curl') {
    return `curl -X POST "${origin}/api/v1/process-url" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com/sample.pdf"
  }'`;
  } else if (lang === 'node') {
    return `const response = await fetch('${origin}/api/v1/process-url', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://example.com/sample.pdf'
  })
});
const data = await response.json();
console.log(data);`;
  } else {
    return `import requests

url = "${origin}/api/v1/process-url"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
payload = {
    "url": "https://example.com/sample.pdf"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`;
  }
}

function getProcessFileCode(lang: string, origin: string): string {
  if (lang === 'curl') {
    return `curl -X POST "${origin}/api/v1/process" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@/path/to/my_scanned_doc.pdf"`;
  } else if (lang === 'node') {
    return `const formData = new FormData();
formData.append('file', fileInput.files[0]); // PDF File object

const response = await fetch('${origin}/api/v1/process', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: formData
});
const data = await response.json();
console.log(data);`;
  } else {
    return `import requests

url = "${origin}/api/v1/process"
headers = {
    "Authorization": "Bearer YOUR_API_KEY"
}
files = {
    "file": open("my_scanned_doc.pdf", "rb")
}

response = requests.post(url, files=files, headers=headers)
print(response.json())`;
  }
}

function getStatusCode(lang: string, origin: string): string {
  if (lang === 'curl') {
    return `curl -X GET "${origin}/api/v1/status/123" \\
  -H "Authorization: Bearer YOUR_API_KEY"`;
  } else if (lang === 'node') {
    return `const response = await fetch('${origin}/api/v1/status/123', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});
const data = await response.json();
console.log(data);`;
  } else {
    return `import requests

url = "${origin}/api/v1/status/123"
headers = {
    "Authorization": "Bearer YOUR_API_KEY"
}

response = requests.get(url, headers=headers)
print(response.json())`;
  }
}

function getListFilesCode(lang: string, origin: string): string {
  if (lang === 'curl') {
    return `curl -X GET "${origin}/api/v1/files" \\
  -H "Authorization: Bearer YOUR_API_KEY"`;
  } else if (lang === 'node') {
    return `const response = await fetch('${origin}/api/v1/files', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});
const data = await response.json();
console.log(data);`;
  } else {
    return `import requests

url = "${origin}/api/v1/files"
headers = {
    "Authorization": "Bearer YOUR_API_KEY"
}

response = requests.get(url, headers=headers)
print(response.json())`;
  }
}

/* ── Page Export (wrapped in AuthProvider) ─── */
export default function DashboardPage() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
