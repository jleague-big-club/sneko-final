'use client';

import type { Post } from '@/components/Timeline';
import Link from 'next/link';
import Image from 'next/image';

interface PostCardProps {
  post: Post;
  isLiked: boolean;
  isKarikariSent: boolean;
  isMatatabi?: boolean;
  catEmoji: string;
  onLike: () => void;
    onKarikariClick: () => void;
    onMatatabiClick?: () => void;
    userLoggedIn: boolean;
    isPremium?: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'たったいま';
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  return `${Math.floor(diff / 86400)}日前`;
}

export default function PostCard({
  post, isLiked, isKarikariSent, isMatatabi, catEmoji, onLike, onKarikariClick, onMatatabiClick, userLoggedIn, isPremium
}: PostCardProps) {
  const cardClass = [
    'post-card',
    post.post_type === 'reply' ? 'is-reply' : '',
    post.post_type === 'churru_reaction' ? 'is-karikari' : '',
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
        <div className="reply-indicator" style={{ color: 'var(--accent-karikari)' }}>
          <span>🍪</span>
          <span>カリカリをもらった！</span>
        </div>
      )}

      {/* ヘッダー: アバター + 猫名 + 時刻 */}
      <div className="post-header">
        <Link href={`/cat/${post.cats?.name}`} style={{ display: 'flex', gap: '12px', textDecoration: 'none', color: 'inherit' }}>
          <div className="cat-avatar">
            {catEmoji.startsWith('/') ? (
              <Image 
                src={catEmoji} 
                alt={post.cats?.name ?? 'cat'} 
                width={40}
                height={40}
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
              />
            ) : (
              catEmoji
            )}
          </div>
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

        {/* カリカリボタン */}
        <button
          className={`action-btn karikari${isKarikariSent && !isPremium ? ' sent' : ''}`}
          onClick={onKarikariClick}
          title={userLoggedIn ? 'カリカリをあげる' : 'ログインが必要です'}
          aria-label={`カリカリ ${post.churru_count}`}
          style={(isKarikariSent && !isPremium) ? { 
            color: 'var(--accent-karikari)', 
            backgroundColor: 'rgba(255,169,77,0.1)',
            borderColor: 'rgba(255,169,77,0.2)'
          } : {}}
        >
          <span>🍪</span>
          <span>カリカリ</span>
          {post.churru_count > 0 && <span style={{ opacity: 0.7 }}>{(isKarikariSent && !isPremium) ? '' : '×'}{post.churru_count}</span>}
        </button>

        {/* またたびボタン */}
        {(isPremium || (post.matatabi_count && post.matatabi_count > 0)) && (
          <button
            className={`action-btn${isMatatabi ? ' matatabi-burst' : ''}`}
            onClick={onMatatabiClick}
            title={isPremium ? '特別なまたたびをあげる🌿' : 'またたびはプレミアム限定です'}
            aria-label={`またたび ${post.matatabi_count || 0}`}
            style={{ 
              color: isMatatabi ? '#fff' : '#4ade80', 
              borderColor: isMatatabi ? 'rgba(74,222,128,0.8)' : 'rgba(74,222,128,0.3)',
              backgroundColor: isMatatabi ? 'rgba(74,222,128,0.25)' : 'rgba(74,222,128,0.05)',
              padding: '6px 12px',
              borderRadius: '20px',
              opacity: isPremium ? 1 : 0.7,
              transition: 'all 0.2s',
              transform: isMatatabi ? 'scale(1.15)' : 'scale(1)'
            }}
            disabled={!isPremium}
          >
            <span className="btn-emoji" style={{ display: 'inline-block', transform: isMatatabi ? 'rotate(-20deg)' : 'none', transition: 'transform 0.2s' }}>🌿</span>
            <span>またたび</span>
            {post.matatabi_count && post.matatabi_count > 0 ? <span style={{ opacity: 0.7 }}>×{post.matatabi_count}</span> : null}
          </button>
        )}
      </div>
    </article>
  );
}
