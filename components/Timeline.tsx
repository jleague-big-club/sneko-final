'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  post_type: 'post' | 'reply' | 'churru_reaction';
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
  onChuuruClick: (postId: string, catName: string) => void;
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

export default function Timeline({ user, onNeedAuth, onChuuruClick, onToast }: TimelineProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPosts = useCallback(async () => {
    const res = await fetch('/api/posts?limit=30');
    if (!res.ok) return;
    const data = await res.json();
    setPosts(data.posts ?? []);
    setLoading(false);
  }, []);

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
    fetchPosts();
    fetchLikedIds();
    // 30秒ごとに自動リフレッシュ
    intervalRef.current = setInterval(fetchPosts, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchPosts, fetchLikedIds]);

  const handleLike = async (postId: string) => {
    if (!user) { onNeedAuth(); return; }
    const token = (await supabaseClient.auth.getSession()).data.session?.access_token;
    const res = await fetch('/api/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ postId }),
    });
    if (!res.ok) return;
    const { liked } = await res.json();

    // 楽観的UI更新
    setLikedIds(prev => {
      const next = new Set(prev);
      liked ? next.add(postId) : next.delete(postId);
      return next;
    });
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, likes_count: p.likes_count + (liked ? 1 : -1) }
          : p
      )
    );
    if (liked) onToast('肉球を押したよ 🐾');
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
          catEmoji={CAT_EMOJI[post.cats?.name ?? ''] ?? '🐱'}
          onLike={() => handleLike(post.id)}
          onChuuruClick={() => onChuuruClick(post.id, post.cats?.name ?? '猫')}
          userLoggedIn={!!user}
        />
      ))}
    </div>
  );
}
