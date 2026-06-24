'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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

const STATUS_MESSAGES = [
  '🧠 AI is analyzing your document...',
  '📐 Extracting mathematical equations...',
  '🔤 Recognizing multilingual text...',
  '✨ Embedding invisible search layer...',
  '🎯 Optimizing for perfection...',
];

/* ── Detail Content ─────────────────────────── */
function DetailContent() {
  const router = useRouter();
  const params = useParams();
  const { user, loading, signOut } = useAuth();
  
  const [pdf, setPdf] = useState<ProcessedPdf | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState(false);

  // Status message rotation
  const [statusMsgIndex, setStatusMsgIndex] = useState(0);

  // Fetch PDF details helper
  const fetchPdf = async () => {
    if (!user || !params.id) return;
    const { data, error: dbError } = await supabaseBrowser
      .from('processed_pdfs')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (dbError || !data) {
      setError(true);
    } else {
      setPdf(data as ProcessedPdf);
    }
    setFetchLoading(false);
  };

  // Auth guard and initial fetch
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchPdf();
    }
  }, [user, params.id]);

  // Auto-refresh: Poll if status is 'processing'
  useEffect(() => {
    if (pdf?.status === 'processing') {
      const interval = setInterval(() => {
        fetchPdf();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [pdf?.status]);

  // Rotate status messages during processing
  useEffect(() => {
    if (pdf?.status !== 'processing') return;
    const msgInterval = setInterval(() => {
      setStatusMsgIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 3000);
    return () => clearInterval(msgInterval);
  }, [pdf?.status]);

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading states
  if (loading || fetchLoading) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (!user) return null;

  if (error || !pdf) {
    return (
      <div className={styles.page}>
        <nav className={styles.navbar}>
          <a href="/" className={styles.logo}>DocuSEO</a>
          <div className={styles.navRight}>
            <span className={styles.userEmail}>{user.email}</span>
            <button className={styles.logoutBtn} onClick={handleLogout}>Logout</button>
          </div>
        </nav>
        <div className={styles.content}>
          <div className={styles.errorState}>
            <span className={styles.errorIcon}>😕</span>
            <h2 className={styles.errorTitle}>PDF not found</h2>
            <p className={styles.errorText}>
              This document doesn&apos;t exist or you don&apos;t have access to it.
            </p>
            <button className={styles.backBtn} onClick={() => router.push('/dashboard')}>
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* ── Navbar ─────────────────── */}
      <nav className={styles.navbar}>
        <a href="/" className={styles.logo}>DocuSEO</a>
        <div className={styles.navRight}>
          <span className={styles.userEmail}>{user.email}</span>
          <button className={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className={styles.content}>
        {/* ── Back Button ──────────── */}
        <button className={styles.backBtn} onClick={() => router.push('/dashboard')}>
          ← Back to Dashboard
        </button>

        {/* ── File Header ──────────── */}
        <div className={styles.detailHeader}>
          <span className={styles.fileIconLarge}>📄</span>
          <h1 className={styles.filename}>{pdf.original_filename}</h1>
          <div className={styles.detailMeta}>
            <span className={styles.metaItem}>
              🕐 {formatDate(pdf.created_at)}
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

        {/* ── Processing Animation ── */}
        {pdf.status === 'processing' && (
          <div className={styles.processingWrapper}>
            <div className={styles.pulseRingContainer}>
              <div className={styles.pulseRing} />
              <div className={styles.pulseRing} />
              <div className={styles.pulseRing} />
              <span className={styles.brainEmoji}>🧠</span>
            </div>
            <p className={styles.statusText}>
              {STATUS_MESSAGES[statusMsgIndex]}
            </p>
          </div>
        )}

        {/* ── Download Cards ─────── */}
        <div className={styles.downloadGrid}>
          {/* Original PDF */}
          <div className={styles.downloadCard}>
            <span className={styles.cardIcon}>📋</span>
            <h3 className={styles.cardTitle}>Original PDF</h3>
            <p className={styles.cardDesc}>
              The original document as uploaded, without searchable text enhancements.
            </p>
            {pdf.original_b2_url ? (
              <a
                href={pdf.original_b2_url}
                className={`${styles.cardBtn} ${styles.cardBtnOutline}`}
              >
                ⬇ Download Original
              </a>
            ) : (
              <span className={`${styles.cardBtn} ${styles.cardBtnOutline}`} style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                Original not available
              </span>
            )}
          </div>

          {/* Searchable PDF */}
          <div className={`${styles.downloadCard} ${styles.downloadCardPrimary}`}>
            <span className={styles.cardIcon}>✨</span>
            <h3 className={styles.cardTitle}>Searchable PDF</h3>
            <p className={styles.cardDesc}>
              Enhanced with an invisible text layer — fully searchable, selectable, and SEO-optimized.
            </p>
            {pdf.status === 'completed' && pdf.b2_url ? (
              <a
                href={pdf.b2_url}
                className={`${styles.cardBtn} ${styles.cardBtnPrimary}`}
              >
                ⬇ Download
              </a>
            ) : pdf.status === 'failed' ? (
              <span className={`${styles.cardBtn} ${styles.cardBtnOutline}`} style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5', cursor: 'not-allowed' }}>
                ❌ Processing Failed
              </span>
            ) : (
              <span className={`${styles.cardBtn} ${styles.cardBtnPrimary}`} style={{ opacity: 0.7, cursor: 'wait' }}>
                ⚙ Processing...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Page Export (wrapped in AuthProvider) ─── */
export default function PdfDetailPage() {
  return (
    <AuthProvider>
      <DetailContent />
    </AuthProvider>
  );
}
