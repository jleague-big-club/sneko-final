'use client';

import { useState, useEffect } from 'react';

interface Props {
  onClose: () => void;
  onLogout: () => void;
  userToken?: string;
}

export default function SettingsModal({ onClose, onLogout, userToken }: Props) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('sn-neko-s-sound');
    if (stored !== null) {
      setSoundEnabled(stored === 'true');
    }
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('sn-neko-s-sound', String(next));
  };

  const handleDeleteAccount = async () => {
    if (!userToken) {
      alert("ログインセッションが見つかりません。");
      return;
    }
    
    setIsDeleting(true);
    try {
      const res = await fetch('/api/user/delete', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      const data = await res.json();
      
      if (data.ok) {
        alert('アカウントを削除しました。🐾');
        onLogout();
        window.location.href = '/';
      } else {
        alert('削除に失敗しました: ' + (data.error || '不明なエラー'));
      }
    } catch (err) {
      console.error(err);
      alert('エラーが発生しました。');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2 className="modal-title">設定 (Neko Settings)</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div style={{ padding: '20px 0' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '1rem' }}>音声設定</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>通知音や効果音のON/OFF</div>
            </div>
            <button 
              onClick={toggleSound}
              style={{
                width: '100px',
                padding: '10px',
                borderRadius: '24px',
                border: 'none',
                backgroundColor: soundEnabled ? '#4ade80' : 'rgba(255,255,255,0.2)',
                color: soundEnabled ? '#111' : '#fff',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.2s',
                fontSize: '0.9rem'
              }}
            >
              {soundEnabled ? '音あり' : '音なし'}
            </button>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px' }}>
            {!showConfirmDelete ? (
              <button 
                onClick={() => setShowConfirmDelete(true)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,77,77,0.5)',
                  backgroundColor: 'transparent',
                  color: '#ff4d4d',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '0.9rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,77,77,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                アカウントを完全に削除する
              </button>
            ) : (
              <div style={{ 
                padding: '16px', 
                backgroundColor: 'rgba(255,77,77,0.1)', 
                borderRadius: '12px',
                border: '1px solid rgba(255,77,77,0.3)'
              }}>
                <div style={{ color: '#ff4d4d', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center', fontSize: '0.95rem' }}>
                  本当に削除しますか？<br/>猫の思い出もすべて消えてしまいます。
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={() => setShowConfirmDelete(false)}
                    style={{ 
                      flex: 1, 
                      padding: '10px', 
                      borderRadius: '8px', 
                      border: '1px solid rgba(255,255,255,0.2)', 
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      color: '#fff',
                      cursor: 'pointer' 
                    }}
                  >
                    やめる
                  </button>
                  <button 
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    style={{ 
                      flex: 1, 
                      padding: '10px', 
                      borderRadius: '8px', 
                      border: 'none', 
                      backgroundColor: '#ff4d4d', 
                      color: '#fff', 
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    {isDeleting ? '中...' : '削除実行'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding-top: 80px;
          padding-bottom: 40px;
          overflow-y: auto;
        }
        .modal-content {
          background: #1a1a1a;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          width: 90%;
          padding: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 16px;
        }
        .modal-title {
          font-size: 1.25rem;
          margin: 0;
          color: #fff;
        }
        .modal-close {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          font-size: 2rem;
          cursor: pointer;
          line-height: 1;
        }
      `}</style>
    </div>
  );
}
