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
  b2_url: string;
  created_at: string;
  user_id: string | null;
}

/* ── Detail Content ─────────────────────────── */
function DetailContent() {
  const router = useRouter();
  const params = useParams();
  const { user, loading, signOut } = useAuth();
  const [pdf, setPdf] = useState<ProcessedPdf | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  // Fetch PDF details
  useEffect(() => {
    async function fetchPdf() {
      if (!user || !params.id) return;
      setFetchLoading(true);

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
    }

    if (user) fetchPdf();
  }, [user, params.id]);

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
            <span className={styles.statusBadge}>Ready ✓</span>
          </div>
        </div>

        {/* ── Download Cards ─────── */}
        <div className={styles.downloadGrid}>
          {/* Original PDF */}
          <div className={styles.downloadCard}>
            <span className={styles.cardIcon}>📋</span>
            <h3 className={styles.cardTitle}>Original PDF</h3>
            <p className={styles.cardDesc}>
              The original document as uploaded, without searchable text enhancements.
            </p>
            <span className={`${styles.cardBtn} ${styles.cardBtnOutline}`}>
              Original not available
            </span>
          </div>

          {/* Searchable PDF */}
          <div className={`${styles.downloadCard} ${styles.downloadCardPrimary}`}>
            <span className={styles.cardIcon}>✨</span>
            <h3 className={styles.cardTitle}>Searchable PDF</h3>
            <p className={styles.cardDesc}>
              Enhanced with an invisible text layer — fully searchable, selectable, and SEO-optimized.
            </p>
            <a
              href={pdf.b2_url}
              className={`${styles.cardBtn} ${styles.cardBtnPrimary}`}
            >
              ⬇ Download
            </a>
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
