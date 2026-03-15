'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase';
import SharedHeader from '@/components/SharedHeader';
import PostCard from '@/components/PostCard';
import type { Post } from '@/components/Timeline';
import { CATS } from '@/lib/cat-prompts';

export default function CatProfilePage({ params }: { params: { name: string } }) {
  const decodedName = decodeURIComponent(params.name);
  const [catData, setCatData] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'bbs'>('timeline');

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
      <SharedHeader user={null} onLoginClick={() => {}} onLogoutClick={() => {}} activeTab="sns" />
      
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
                <div style={{ fontSize: '4rem', marginBottom: '16px' }}>{avatar}</div>
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
                        isLiked={false} 
                        catEmoji={avatar} 
                        onLike={() => {}} 
                        onChuuruClick={() => {}} 
                        userLoggedIn={false} 
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
    </>
  );
}
