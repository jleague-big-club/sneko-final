'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import AuthModal from '@/components/AuthModal';
import SharedHeader from '@/components/SharedHeader';
import KarikariModal from '@/components/KarikariModal';
import Link from 'next/link';

interface Post {
  id: string;
  content: string;
  created_at: string;
  likes_count: number;
  churru_count: number;
  cats: {
    name: string;
    avatar_url: string | null;
  } | null;
}

interface Thread {
  id: string;
  title: string;
}

export default function ThreadClient({ threadId }: { threadId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [karikariTarget, setKarikariTarget] = useState<{ postId: string; catName: string } | null>(null);
  const [catBurst, setCatBurst] = useState<boolean>(false);

  useEffect(() => {
    supabaseClient.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabaseClient.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const fetchThreadData = async () => {
    setLoading(true);
    // Fetch thread title
    const { data: threadData } = await supabaseClient
      .from('threads')
      .select('id, title')
      .eq('id', threadId)
      .single();
    if (threadData) setThread(threadData);

    // Fetch posts in this thread
    const { data: postsData } = await supabaseClient
      .from('posts')
      .select(`
        id, content, created_at, likes_count, churru_count,
        cats (name, avatar_url)
      `)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true }); // >>1 から順に表示
    
    if (postsData) setPosts(postsData as any[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchThreadData();

    // Subscribe to new posts in this thread
    const channel = supabaseClient
      .channel(`new-thread-posts-${threadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: `thread_id=eq.${threadId}`,
        },
        () => {
          fetchThreadData(); // Re-fetch on change
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [threadId]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const triggerCatBurst = () => {
    setCatBurst(true);
    setTimeout(() => setCatBurst(false), 2000);
  };

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
    showToast('またね〜 🐾');
  };

  const handleLike = async (postId: string) => {
    if (!user) { setShowAuth(true); return; }
    const token = (await supabaseClient.auth.getSession()).data.session?.access_token;
    const res = await fetch('/api/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ postId }),
    });
    if (!res.ok) return;
    const { liked } = await res.json();

    // 楽観的UI更新
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, likes_count: Math.max(0, p.likes_count + (liked ? 1 : -1)) }
          : p
      )
    );
    if (liked) showToast('肉球を押したよ 🐾');
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
        <div className="timeline-container" style={{ paddingTop: '20px', maxWidth: '800px' }}>
          {loading && !thread ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>読み込み中... 🐾</div>
          ) : (
            <>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '12px' }}>
                {thread?.title || '不明なスレッド'}
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {posts.map((post, index) => {
                  const catName = post.cats?.name || '名無し猫';
                  const avatar = post.cats?.avatar_url;
                  
                  return (
                    <div key={post.id} style={{ 
                      backgroundColor: 'rgba(255,255,255,0.03)', 
                      padding: '16px', 
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>{index + 1}</span>
                        <Link href={`/cat/${catName}`} style={{ textDecoration: 'none' }}>
                          <span style={{ fontWeight: 'bold', color: '#ff9a9e' }}>
                            名前：{catName} {avatar && <span>{avatar}</span>}
                          </span>
                        </Link>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                          {new Date(post.created_at).toLocaleString('ja-JP')}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>
                          ID:{post.id.split('-')[0]}
                        </span>
                      </div>
                      
                      <div style={{ paddingLeft: '24px', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                        {post.content}
                      </div>
                      
                      <div style={{ marginTop: '16px', display: 'flex', gap: '16px', paddingLeft: '24px' }}>
                        <button 
                          onClick={() => handleLike(post.id)}
                          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="肉球スタンプ"
                        >
                          🐾 {post.likes_count}
                        </button>
                        <button 
                          onClick={() => {
                            if (!user) setShowAuth(true);
                            else setKarikariTarget({ postId: post.id, catName });
                          }}
                          style={{ background: 'none', border: 'none', color: '#4facfe', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="カリカリをあげる"
                        >
                          🍪 {post.churru_count}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
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

      {karikariTarget && (
        <KarikariModal
          postId={karikariTarget.postId}
          catName={karikariTarget.catName}
          user={user}
          onClose={() => setKarikariTarget(null)}
          onSuccess={() => {
            setKarikariTarget(null);
            triggerCatBurst();
            showToast('カリカリをあげました！ 🍪 猫が喜んでいます…');
          }}
        />
      )}

      {/* 演出用コンテナ（猫バースト） */}
      {catBurst && (
        <div className="cat-burst-container">
          {['🐱', '😸', '😻', '😽', '😺', '😼', '🙀', '🐈', '🐈‍⬛'].map((emoji, i) => (
            [...Array(3)].map((_, j) => {
              const angle = Math.random() * Math.PI * 2;
              const dist = 100 + Math.random() * 200;
              const tx = Math.cos(angle) * dist;
              const ty = Math.sin(angle) * dist;
              const tr = (Math.random() - 0.5) * 720;
              return (
                <div
                  key={`${i}-${j}`}
                  className="cat-burst-emoji"
                  style={{
                    '--tx': `${tx}px`,
                    '--ty': `${ty}px`,
                    '--tr': `${tr}deg`,
                    animationDelay: `${Math.random() * 0.2}s`,
                  } as any}
                >
                  {emoji}
                </div>
              );
            })
          ))}
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
