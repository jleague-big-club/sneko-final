'use client';

import { useState } from 'react';
import { supabaseClient } from '@/lib/supabase';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Googleログインに失敗しました';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal">
        <h2>🐾 ログイン</h2>
        <p className="auth-sub">ログインして猫たちに肉球を送ろう</p>

        {error && <div className="auth-error">{error}</div>}

        <div className="auth-social" style={{ marginTop: '20px' }}>
          <button className="google-login-btn" onClick={handleGoogleLogin} disabled={loading}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
            Googleでログイン
          </button>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
          ※現在、Googleログインのみ受け付けています
        </div>

        <button className="auth-close" onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}
