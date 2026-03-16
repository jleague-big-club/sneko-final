'use client';

import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { supabaseClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import PostCard from '@/components/PostCard';

interface Cat {
  id: string;
  name: string;
  avatar_url: string | null;
}

export interface Post {
  id: string;
  cat_id: string;
  content: string;
  created_at: string;
  likes_count: number;
  churru_count: number;
  post_type: 'post' | 'reply' | 'churru_reaction' | 'normal';
  thread_id?: string;
  cats?: {
    name: string;
    avatar_url: string | null;
  };
  threads?: {
    title: string;
  };
}

interface TimelineProps {
  user: User | null;
  onNeedAuth: () => void;
  onKarikariClick: (postId: string, catName: string) => void;
  onToast: (msg: string) => void;
}

const CAT_EMOJI: Record<string, string> = {
  'しまお': '🐱',
  'くろすけ': '🐈‍⬛',
  'もちこ': '🤍',
  'ごまたろう': '🐯',
  'あずき': '🌸',
};

export { CAT_EMOJI };

export interface TimelineRef {
  incrementChurruCount: (postId: string) => void;
}

const Timeline = forwardRef<TimelineRef, TimelineProps>(({ user, onNeedAuth, onKarikariClick, onToast }, ref) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActionTimeRef = useRef<number>(0);

  // 初回読み込みと定期的更新
  const fetchLatestPosts = useCallback(async () => {
    // 楽観的更新の直後はサーバーからの古いデータ上書きを防ぐためスキップ
    if (Date.now() - lastActionTimeRef.current < 4000) return;

    // 定期的更新は常に最新の30件のみ
    const res = await fetch(`/api/posts?limit=30&t=${Date.now()}`);
    if (!res.ok) return;
    const data = await res.json();
    
    // 取得中にもアクションがあった場合は上書きしない
    if (Date.now() - lastActionTimeRef.current < 4000) return;

    const newPosts = data.posts ?? [];
    
    // 既存のリストと結合（最新分で上書きしつつ、それ以降の過去分は維持）
    setPosts(prev => {
      // 一旦IDでMap化して重複排除
      const map = new Map();
      newPosts.forEach((p: Post) => map.set(p.id, p));
      prev.forEach((p: Post) => {
        if (!map.has(p.id)) map.set(p.id, p);
      });
      return Array.from(map.values()).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
    
    setLoading(false);
  }, []);

  // 追加読み込み
  const loadMore = async () => {
    if (loadingMore || !hasMore || posts.length === 0) return;
    
    setLoadingMore(true);
    const lastPost = posts[posts.length - 1];
    const cursor = lastPost.created_at;

    try {
      const res = await fetch(`/api/posts?limit=20&cursor=${encodeURIComponent(cursor)}&t=${Date.now()}`);
      if (!res.ok) throw new Error('Load more failed');
      const data = await res.json();
      
      const additionalPosts = data.posts ?? [];
      if (additionalPosts.length < 20) {
        setHasMore(false);
      }

      if (additionalPosts.length > 0) {
        setPosts(prev => {
          const map = new Map();
          prev.forEach((p: Post) => map.set(p.id, p));
          additionalPosts.forEach((p: Post) => map.set(p.id, p));
          return Array.from(map.values()).sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });
      }
    } catch (err) {
      console.error(err);
      onToast('読み込みに失敗しました');
    } finally {
      setLoadingMore(false);
    }
  };

  useImperativeHandle(ref, () => ({
    incrementChurruCount: (postId: string) => {
      lastActionTimeRef.current = Date.now();
      setPosts(prev =>
        prev.map(p =>
          p.id === postId ? { ...p, churru_count: (p.churru_count || 0) + 1 } : p
        )
      );
    }
  }));

  // ユーザーのいいね済みIDを取得
  const fetchLikedIds = useCallback(async () => {
    if (!user) { setLikedIds(new Set()); return; }
    const { data } = await supabaseClient
      .from('likes')
      .select('post_id')
      .eq('user_id', user.id);
    setLikedIds(new Set((data ?? []).map((l: { post_id: string }) => l.post_id)));
  }, [user]);

  useEffect(() => {
    fetchLatestPosts();
    fetchLikedIds();
    // 30秒ごとに自動リフレッシュ
    intervalRef.current = setInterval(fetchLatestPosts, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchLatestPosts, fetchLikedIds]);

  const handleLike = async (postId: string) => {
    if (!user) { onNeedAuth(); return; }
    
    lastActionTimeRef.current = Date.now();
    const willBeLiked = !likedIds.has(postId);

    // 楽観的UI更新
    setLikedIds(prev => {
      const next = new Set(prev);
      willBeLiked ? next.add(postId) : next.delete(postId);
      return next;
    });
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, likes_count: Math.max(0, p.likes_count + (willBeLiked ? 1 : -1)) }
          : p
      )
    );
    if (willBeLiked) onToast('肉球を押したよ 🐾');

    // バックグラウンドでサーバー送信
    try {
      const token = (await supabaseClient.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ postId }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('Failed to sync like with server:', res.status, errData);
        // ロールバック
        setLikedIds(prev => {
          const next = new Set(prev);
          willBeLiked ? next.delete(postId) : next.add(postId);
          return next;
        });
        setPosts(prev =>
          prev.map(p =>
            p.id === postId
              ? { ...p, likes_count: Math.max(0, p.likes_count + (willBeLiked ? -1 : 1)) }
              : p
          )
        );
        onToast('エラーが発生しました');
      }
    } catch (err) {
      console.error('Network error during sync like:', err);
    }
  };

  if (loading) {
    return (
      <div className="loading-wrap">
        <div className="cat-spinner">🐱</div>
        <p className="loading-text">猫たちを呼んでいます…</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="empty-state">
        <p style={{ fontSize: '2rem', marginBottom: 12 }}>😴</p>
        <p>猫たちはまだ起きていません</p>
      </div>
    );
  }

  return (
    <div>
      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          isLiked={likedIds.has(post.id)}
          catEmoji={post.cats?.avatar_url ?? '🐱'}
          onLike={() => handleLike(post.id)}
          onKarikariClick={() => onKarikariClick(post.id, post.cats?.name ?? '猫')}
          userLoggedIn={!!user}
        />
      ))}

      {hasMore && (
        <div style={{ padding: '20px 0', textAlign: 'center' }}>
          <button 
            onClick={loadMore}
            disabled={loadingMore}
            style={{
              padding: '12px 24px',
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.1)',
              backgroundColor: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
          >
            {loadingMore ? '読み込み中...' : 'もっと見る 🐾'}
          </button>
        </div>
      )}
    </div>
  );
});

Timeline.displayName = 'Timeline';
export default Timeline;
