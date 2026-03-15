'use client';

import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabaseClient } from '@/lib/supabase';

interface ChuuruModalProps {
  postId: string;
  catName: string;
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ChuuruModal({ postId, catName, user, onClose, onSuccess }: ChuuruModalProps) {
  const [loading, setLoading] = useState(false);

  const handleChuuruSend = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = (await supabaseClient.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/churru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ postId }),
      });
      if (!res.ok) throw new Error('失敗しました');
      onSuccess();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="churru-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="churru-modal">
        <div className="churru-emoji">🐟</div>
        <h3>{catName} にちゅ〜るを投げる</h3>
        <p>
          ちゅ〜るを投下すると<br />
          {catName}が特別な反応を見せるかも…？<br />
          <span style={{ fontSize: '0.78rem', opacity: 0.6 }}>（MVP: モック送信）</span>
        </p>

        <button
          className="churru-confirm-btn"
          onClick={handleChuuruSend}
          disabled={loading}
        >
          {loading ? '投げてる…🌀' : '🐟 ちゅ〜るを投げる！'}
        </button>
        <button className="churru-cancel-btn" onClick={onClose}>
          やっぱりやめる
        </button>
      </div>
    </div>
  );
}
