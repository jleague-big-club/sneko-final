'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase';
import SharedHeader from '@/components/SharedHeader';
import PostCard from '@/components/PostCard';
import type { Post } from '@/components/Timeline';
import { CATS } from '@/lib/cat-prompts';
import Image from 'next/image';
import type { User } from '@supabase/supabase-js';
import KarikariModal from '@/components/KarikariModal';
import AuthModal from '@/components/AuthModal';

export default function CatProfilePage({ params }: { params: { name: string } }) {
  const decodedName = decodeURIComponent(params.name);
  const [catData, setCatData] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'bbs'>('timeline');

  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [karikariSentIds, setKarikariSentIds] = useState<Set<string>>(new Set());
  const [karikariTarget, setKarikariTarget] = useState<{postId: string, catName: string} | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [catBurst, setCatBurst] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };
  const triggerCatBurst = () => {
    setCatBurst(true);
    setTimeout(() => setCatBurst(false), 2000);
  };

  useEffect(() => {
    supabaseClient.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: authListener } = supabaseClient.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setLikedIds(new Set());
      setKarikariSentIds(new Set());
      return;
    }
    const fetchStates = async () => {
      const [{ data: l }, { data: k }] = await Promise.all([
        supabaseClient.from('likes').select('post_id').eq('user_id', user.id),
        supabaseClient.from('churrus').select('post_id').eq('user_id', user.id)
      ]);
      setLikedIds(new Set((l ?? []).map((i: any) => i.post_id)));
      setKarikariSentIds(new Set((k ?? []).map((i: any) => i.post_id)));
    };
    fetchStates();
  }, [user]);

  const handleLike = async (postId: string) => {
    if (!user) { setShowAuth(true); return; }
    const willBeLiked = !likedIds.has(postId);

    setLikedIds(prev => {
      const next = new Set(prev);
      willBeLiked ? next.add(postId) : next.delete(postId);
      return next;
    });
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, likes_count: Math.max(0, p.likes_count + (willBeLiked ? 1 : -1)) } : p
    ));
    if (willBeLiked) showToast('肉球を押したよ 🐾');

    try {
      const token = (await supabaseClient.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ postId }),
      });
      if (!res.ok) {
        setLikedIds(prev => {
          const next = new Set(prev);
          willBeLiked ? next.delete(postId) : next.add(postId);
          return next;
        });
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, likes_count: Math.max(0, p.likes_count + (willBeLiked ? -1 : 1)) } : p
        ));
        showToast('エラーが発生しました');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleKarikariMode = async (postId: string, catName: string) => {
    if (!user) { setShowAuth(true); return; }
    const willBeSent = !karikariSentIds.has(postId);

    if (willBeSent) {
      setKarikariTarget({ postId, catName });
      return;
    }

    setKarikariSentIds(prev => {
      const next = new Set(prev);
      next.delete(postId);
      return next;
    });
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, churru_count: Math.max(0, p.churru_count - 1) } : p
    ));
    showToast('カリカリを下げたよ 🐾');

    try {
      const token = (await supabaseClient.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/karikari', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ postId }),
      });

      if (!res.ok) {
        // ロールバック
        setKarikariSentIds(prev => {
          const next = new Set(prev);
          next.add(postId);
          return next;
        });
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, churru_count: p.churru_count + 1 } : p
        ));
        showToast('エラーが発生しました');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    showToast('ログアウトしました');
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      // Get cat info
      const { data: cat } = await supabaseClient
        .from('cats')
        .select('*')
        .eq('name', decodedName)
        .single();
      
      setCatData(cat);

      // Get posts by this cat
      const { data: postsData } = await supabaseClient
        .from('posts')
        .select(`
          id, content, created_at, likes_count, churru_count, post_type, thread_id,
          cats (name, avatar_url),
          threads (title)
        `)
        .eq('cat_id', cat?.id)
        .order('created_at', { ascending: false });

      if (postsData) setPosts(postsData as any);
      setLoading(false);
    }
    fetchData();
  }, [decodedName]);

  const catPrompt = CATS.find(c => c.name === decodedName);
  const avatar = catPrompt?.avatar || '🐱';

  const timelinePosts = posts.filter(p => !p.thread_id);
  const bbsPosts = posts.filter(p => p.thread_id);

  return (
    <>
      <SharedHeader user={user} onLoginClick={() => setShowAuth(true)} onLogoutClick={handleLogout} activeTab="sns" />
      
      <main className="main-content">
        <div className="timeline-container" style={{ paddingTop: '40px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>読み込み中... 🐾</div>
          ) : !catData ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '20px' }}>😿</div>
              <h2>その猫は見つかりませんでした</h2>
            </div>
          ) : (
            <>
              {/* プロフィールヘッダー */}
              <div style={{ 
                backgroundColor: 'rgba(255,255,255,0.05)', 
                padding: '30px', 
                borderRadius: '16px', 
                marginBottom: '30px',
                border: '1px solid rgba(255,255,255,0.1)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '16px' }}>
                  {catData.avatar_url ? (
                    <Image 
                      src={catData.avatar_url} 
                      alt={catData.name} 
                      width={120}
                      height={120}
                      style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto' }} 
                    />
                  ) : (
                    avatar
                  )}
                </div>
                <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>{catData.name}</h1>
                <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: '1.6', maxWidth: '600px', margin: '0 auto' }}>
                  {catData.personality}
                </p>
              </div>

              {/* タブ切り替え */}
              <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <button 
                  onClick={() => setActiveTab('timeline')}
                  style={{ 
                    padding: '12px 20px', 
                    background: 'none', 
                    border: 'none', 
                    color: activeTab === 'timeline' ? '#ff9a9e' : 'rgba(255,255,255,0.5)',
                    borderBottom: activeTab === 'timeline' ? '2px solid #ff9a9e' : 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  SNS投稿 ({timelinePosts.length})
                </button>
                <button 
                  onClick={() => setActiveTab('bbs')}
                  style={{ 
                    padding: '12px 20px', 
                    background: 'none', 
                    border: 'none', 
                    color: activeTab === 'bbs' ? '#4facfe' : 'rgba(255,255,255,0.5)',
                    borderBottom: activeTab === 'bbs' ? '2px solid #4facfe' : 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  掲示板レス ({bbsPosts.length})
                </button>
              </div>

              {/* 投稿一覧 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {activeTab === 'timeline' ? (
                  timelinePosts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>まだ呟きがありません。</div>
                  ) : (
                    timelinePosts.map(post => (
                      <PostCard 
                        key={post.id} 
                        post={post} 
                        isLiked={likedIds.has(post.id)} 
                        isKarikariSent={karikariSentIds.has(post.id)}
                        catEmoji={catData.avatar_url || avatar} 
                        onLike={() => handleLike(post.id)} 
                        onKarikariClick={() => handleKarikariMode(post.id, catData.name)} 
                        userLoggedIn={!!user} 
                      />
                    ))
                  )
                ) : (
                  bbsPosts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>まだ掲示板への書き込みがありません。</div>
                  ) : (
                    bbsPosts.map(post => (
                      <div key={post.id} style={{ 
                        backgroundColor: 'rgba(255,255,255,0.03)', 
                        padding: '16px', 
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                         <div style={{ fontSize: '0.85rem', color: '#4facfe', marginBottom: '8px' }}>
                           スレ：{post.threads?.title || '不明なスレッド'}
                         </div>
                         <div style={{ whiteSpace: 'pre-wrap' }}>{post.content}</div>
                         <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>
                           {new Date(post.created_at).toLocaleString('ja-JP')}
                         </div>
                      </div>
                    ))
                  )
                )}
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
            if (karikariTarget) {
              setKarikariSentIds(prev => {
                const next = new Set(prev);
                next.add(karikariTarget.postId);
                return next;
              });
              setPosts(prev => prev.map(p => 
                p.id === karikariTarget.postId ? { ...p, churru_count: (p.churru_count || 0) + 1 } : p
              ));
            }
            setKarikariTarget(null);
            triggerCatBurst();
            showToast('カリカリをあげました！ 🍪 猫が喜んでいます…');
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}

      {catBurst && (
        <div className="cat-burst-container">
          {['🐱', '😸', '😻', '😽', '😺', '😼', '🙀', '🐈', '🐈‍⬛'].map((emoji, i) => (
            <div key={i} className="burst-cat" style={{ '--i': i } as any}>
              {emoji}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
