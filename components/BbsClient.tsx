'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import AuthModal from '@/components/AuthModal';
import SharedHeader from '@/components/SharedHeader';
import Link from 'next/link';
import Image from 'next/image';

interface Thread {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  cats: { name: string, avatar_url: string | null } | null;
  post_count?: number;
}

export default function BbsClient() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalThreads, setTotalThreads] = useState(0);
  const itemsPerPage = 20;

  useEffect(() => {
    supabaseClient.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabaseClient.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const fetchThreads = async (page: number) => {
    setLoading(true);
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    // Fetch threads and also count how many posts belong to each thread
    const { data: threadsData, error, count } = await supabaseClient
      .from('threads')
      .select(`
        id, title, created_at, updated_at,
        cats (name, avatar_url),
        posts (count)
      `, { count: 'exact' })
      .eq('board_id', 'bbs')
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (!error && threadsData) {
      // Map post count
      const mapped = threadsData.map((t: any) => ({
        ...t,
        post_count: t.posts ? t.posts[0]?.count ?? 0 : 0
      }));
      setThreads(mapped);
      if (count !== null) setTotalThreads(count);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchThreads(currentPage);
  }, [currentPage]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
    showToast('またね〜 🐾');
  };

  return (
    <>
      <SharedHeader 
        user={user} 
        onLoginClick={() => setShowAuth(true)} 
        onLogoutClick={handleSignOut} 
        activeTab="bbs" 
      />

      <main className="main-content">
        <div className="timeline-container">
          <div className="timeline-header">
            <span className="timeline-title">// BBS (裏路地の掲示板)</span>
            <span className="online-badge">
              <span className="online-dot" />
              猫たちが集会中
            </span>
          </div>

          <div className="threads-list">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>
                読み込み中... 🐾
              </div>
            ) : threads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>
                まだスレッドがありません。
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {threads.map((thread, index) => (
                  <Link href={`/bbs/thread/${thread.id}`} key={thread.id} style={{ textDecoration: 'none' }}>
                    <div style={{ 
                      padding: '16px', 
                      backgroundColor: 'rgba(255,255,255,0.03)', 
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.05)',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                    >
                      <h3 style={{ fontSize: '1.1rem', margin: '0 0 8px 0', color: '#fff' }}>
                        {(currentPage - 1) * itemsPerPage + index + 1}: {thread.title} ({thread.post_count})
                      </h3>
                      <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                            {thread.cats?.avatar_url?.startsWith('/') ? (
                              <Image src={thread.cats.avatar_url} alt={thread.cats.name} width={20} height={20} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: '0.8rem' }}>{thread.cats?.avatar_url || '🐱'}</span>
                            )}
                          </div>
                          <span>作成者: {thread.cats?.name || '不明'}</span>
                        </div>
                        <span>最終更新: {new Date(thread.updated_at).toLocaleString('ja-JP')}</span>
                      </div>
                    </div>
                  </Link>
                ))}

                {/* Pagination UI */}
                {totalThreads > itemsPerPage && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    gap: '8px', 
                    marginTop: '24px', 
                    paddingBottom: '20px',
                    flexWrap: 'wrap'
                  }}>
                    {Array.from({ length: Math.ceil(totalThreads / itemsPerPage) }, (_, i) => i + 1).map(pageNum => (
                      <button
                        key={pageNum}
                        onClick={() => {
                          setCurrentPage(pageNum);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          backgroundColor: currentPage === pageNum ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                          color: '#fff',
                          cursor: 'pointer',
                          fontWeight: currentPage === pageNum ? 'bold' : 'normal',
                          minWidth: '40px',
                          transition: 'all 0.2s'
                        }}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={() => {
            setShowAuth(false);
            showToast('ログインしました 🐾');
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
