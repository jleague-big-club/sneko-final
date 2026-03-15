'use client';

import type { Post } from '@/components/Timeline';
import Link from 'next/link';

interface PostCardProps {
  post: Post;
  isLiked: boolean;
  catEmoji: string;
  onLike: () => void;
  onChuuruClick: () => void;
  userLoggedIn: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'たったいま';
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  return `${Math.floor(diff / 86400)}日前`;
}

export default function PostCard({
  post, isLiked, catEmoji, onLike, onChuuruClick, userLoggedIn,
}: PostCardProps) {
  const cardClass = [
    'post-card',
    post.post_type === 'reply' ? 'is-reply' : '',
    post.post_type === 'churru_reaction' ? 'is-churru' : '',
  ].filter(Boolean).join(' ');

  return (
    <article className={cardClass}>
      {/* リプライ/ちゅ〜るリアクション表示 */}
      {post.post_type === 'reply' && (
        <div className="reply-indicator">
          <span>↩</span>
          <span>返信中</span>
        </div>
      )}
      {post.post_type === 'churru_reaction' && (
        <div className="reply-indicator" style={{ color: 'var(--accent-churru)' }}>
          <span>🐟</span>
          <span>ちゅ〜るをもらった！</span>
        </div>
      )}

      {/* ヘッダー: アバター + 猫名 + 時刻 */}
      <div className="post-header">
        <Link href={`/cat/${post.cats?.name}`} style={{ display: 'flex', gap: '12px', textDecoration: 'none', color: 'inherit' }}>
          <div className="cat-avatar">{catEmoji}</div>
          <div className="cat-info">
            <div className="cat-name">{post.cats?.name ?? '???'}</div>
            <div className="post-time">{timeAgo(post.created_at)}</div>
          </div>
        </Link>
      </div>

      {/* 本文 */}
      <p className="post-content">{post.content}</p>

      {/* アクションボタン */}
      <div className="post-actions">
        {/* 肉球いいね */}
        <button
          className={`action-btn paw${isLiked ? ' liked' : ''}`}
          onClick={onLike}
          title={userLoggedIn ? 'いいね' : 'ログインが必要です'}
          aria-label={`いいね ${post.likes_count}`}
        >
          <span className="btn-emoji">🐾</span>
          <span>{post.likes_count}</span>
        </button>

        {/* ちゅ〜るボタン */}
        <button
          className="action-btn churru"
          onClick={onChuuruClick}
          title={userLoggedIn ? 'ちゅ〜るを投げる' : 'ログインが必要です'}
          aria-label={`ちゅ〜る ${post.churru_count}`}
        >
          <span>🐟</span>
          <span>ちゅ〜る</span>
          {post.churru_count > 0 && <span style={{ opacity: 0.7 }}>×{post.churru_count}</span>}
        </button>
      </div>
    </article>
  );
}
