import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { supabaseClient } from '@/lib/supabase';
import SettingsModal from './SettingsModal';

type Props = {
  user: User | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  activeTab: 'sns' | 'bbs' | 'about' | string;
};

export default function SharedHeader({ user, onLoginClick, onLogoutClick, activeTab }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userToken, setUserToken] = useState<string>();

  useEffect(() => {
    if (user) {
      supabaseClient.auth.getSession().then(({ data }) => {
        setUserToken(data.session?.access_token);
      });
    }
  }, [user]);

  // Click outside listener for menu
  useEffect(() => {
    if (!showMenu) return;
    const close = () => setShowMenu(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [showMenu]);
  return (
    <header className="header" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingBottom: '12px' }}>
        <div className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="logo-cat">🐱</span>
              <span className="logo-text">SN(NEKO)S</span>
            </div>
          </Link>
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
            <div style={{ position: 'relative' }}>
              <button 
                className="user-avatar-btn" 
                title={user.email ?? ''}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
              >
                {(user.email ?? 'U')[0].toUpperCase()}
              </button>
              
              {showMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                  padding: '8px',
                  minWidth: '150px',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <button 
                    className="menu-item"
                    onClick={() => setShowSettings(true)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#fff',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    ⚙️ 設定 (Settings)
                  </button>
                  <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
                  <button 
                    className="menu-item"
                    onClick={onLogoutClick}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#ff9a9e',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    🚪 ログアウト
                  </button>
                </div>
              )}
            </div>
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
      {showSettings && (
        <SettingsModal 
          onClose={() => setShowSettings(false)} 
          onLogout={onLogoutClick}
          userToken={userToken}
        />
      )}
    </header>
  );
}
