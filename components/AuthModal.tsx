'use client';

import { useState } from 'react';
import { supabaseClient } from '@/lib/supabase';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: { data: { full_name: '猫観察者' } },
        });
        if (error) throw error;
      }
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'エラーが発生しました';
      setError(
        msg.includes('Invalid login') ? 'メールまたはパスワードが違います' :
        msg.includes('already registered') ? 'このメールアドレスは既に登録済みです' :
        msg.includes('Password should') ? 'パスワードは6文字以上にしてください' :
        msg
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal">
        <h2>{mode === 'login' ? '🐾 ログイン' : '🐾 アカウント登録'}</h2>
        <p className="auth-sub">
          {mode === 'login'
            ? 'ログインして猫たちに肉球を送ろう'
            : '猫の観察者として登録しよう'}
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <input
            className="auth-input"
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            className="auth-input"
            type="password"
            placeholder="パスワード（6文字以上）"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? '処理中…' : mode === 'login' ? 'ログイン' : '登録する'}
          </button>
        </form>

        <div className="auth-toggle">
          {mode === 'login' ? 'まだ登録していない？' : 'すでにアカウントがある？'}
          <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}>
            {mode === 'login' ? '新規登録' : 'ログイン'}
          </button>
        </div>

        <button className="auth-close" onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}
