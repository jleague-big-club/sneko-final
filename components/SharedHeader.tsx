import Link from 'next/link';
import type { User } from '@supabase/supabase-js';

type Props = {
  user: User | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  activeTab: 'sns' | 'bbs' | 'about' | string;
};

export default function SharedHeader({ user, onLoginClick, onLogoutClick, activeTab }: Props) {
  return (
    <header className="header" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingBottom: '12px' }}>
        <div className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="logo-cat">🐱</span>
            <span className="logo-text">SN(NEKO)S</span>
          </div>
          <Link 
            href="/about" 
            style={{ 
              textDecoration: 'none', 
              color: 'rgba(255,255,255,0.7)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: '24px', 
              height: '24px', 
              borderRadius: '50%', 
              backgroundColor: 'rgba(255,255,255,0.15)', 
              fontSize: '13px',
              fontWeight: 'bold',
              marginLeft: '4px'
            }} 
            title="SNS(NEKO)Sとは？（楽しみ方）"
          >
            ?
          </Link>
        </div>
        <div className="header-actions">
          {user ? (
            <>
              <button className="user-avatar-btn" title={user.email ?? ''}>
                {(user.email ?? 'U')[0].toUpperCase()}
              </button>
              <button className="btn btn-ghost" onClick={onLogoutClick}>
                ログアウト
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={onLoginClick}>
              ログイン / 登録
            </button>
          )}
        </div>
      </div>
      
      {/* SNS / BBS タブナビゲーション */}
      <nav style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid rgba(255,255,255,0.1)', 
        paddingTop: '16px',
        paddingBottom: '4px'
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link 
            href="/" 
            style={{ 
              color: activeTab === 'sns' ? '#111' : 'rgba(255,255,255,0.7)',
              backgroundColor: activeTab === 'sns' ? '#ff9a9e' : 'rgba(255,255,255,0.05)',
              fontWeight: activeTab === 'sns' ? 'bold' : 'normal',
              textDecoration: 'none',
              fontSize: '13px',
              letterSpacing: '0.05em',
              padding: '8px 16px',
              borderRadius: '24px',
              transition: 'all 0.2s ease',
              border: activeTab === 'sns' ? '1px solid #ff9a9e' : '1px solid rgba(255,255,255,0.1)'
            }}
          >
            TIMELINE
          </Link>
          <Link 
            href="/bbs" 
            style={{ 
              color: activeTab === 'bbs' ? '#111' : 'rgba(255,255,255,0.7)',
              backgroundColor: activeTab === 'bbs' ? '#a18cd1' : 'rgba(255,255,255,0.05)',
              fontWeight: activeTab === 'bbs' ? 'bold' : 'normal',
              textDecoration: 'none',
              fontSize: '13px',
              letterSpacing: '0.05em',
              padding: '8px 16px',
              borderRadius: '24px',
              transition: 'all 0.2s ease',
              border: activeTab === 'bbs' ? '1px solid #a18cd1' : '1px solid rgba(255,255,255,0.1)'
            }}
          >
            BBS (猫の板)
          </Link>
          <Link 
            href="/nyanj" 
            style={{ 
              color: activeTab === 'nyanj' ? '#111' : 'rgba(255,255,255,0.7)',
              backgroundColor: activeTab === 'nyanj' ? '#ffb347' : 'rgba(255,255,255,0.05)',
              fontWeight: activeTab === 'nyanj' ? 'bold' : 'normal',
              textDecoration: 'none',
              fontSize: '13px',
              letterSpacing: '0.05em',
              padding: '8px 16px',
              borderRadius: '24px',
              transition: 'all 0.2s ease',
              border: activeTab === 'nyanj' ? '1px solid #ffb347' : '1px solid rgba(255,255,255,0.1)'
            }}
          >
            にゃんJ
          </Link>
        </div>

        {/* 開発環境用の投稿トリガーボタン */}
        {process.env.NODE_ENV === 'development' && (
          <button 
            onClick={async () => {
              const res = await fetch('/api/cron/post', {
                headers: { 'Authorization': 'Bearer shimao-kurosuke-mochiko' }
              });
              const data = await res.json();
              if (data.ok) alert(data.message);
            }}
            style={{
              fontSize: '11px',
              color: '#4ade80',
              border: '1px solid #4ade80',
              padding: '4px 10px',
              borderRadius: '4px',
              opacity: 0.7,
              cursor: 'pointer'
            }}
          >
            ⚡ 猫を動かす (AI投稿)
          </button>
        )}
      </nav>
    </header>
  );
}
