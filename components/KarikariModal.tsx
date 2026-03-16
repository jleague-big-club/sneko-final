'use client';

import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabaseClient } from '@/lib/supabase';

interface KarikariModalProps {
  postId: string;
  catName: string;
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function KarikariModal({ postId, catName, user, onClose, onSuccess }: KarikariModalProps) {
  const [loading, setLoading] = useState(false);

  const handleKarikariSend = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = (await supabaseClient.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/karikari', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ postId }),
      });
      if (!res.ok) throw new Error('失敗しました');
      
      // 音声を再生（設定がOFFならスキップ）
      try {
        const isSoundEnabled = localStorage.getItem('sn-neko-s-sound') !== 'false';
        if (isSoundEnabled) {
          const audio = new Audio('/sounds/meow.mp3');
          audio.play().catch(err => console.warn('Audio play failed:', err));
        }
      } catch (audioErr) {
        console.warn('Audio object creation failed:', audioErr);
      }

      onSuccess();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="karikari-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="karikari-modal">
        <div className="karikari-emoji">🍪</div>
        <h3>{catName} にカリカリをあげる</h3>
        <p>
          カリカリをあげると<br />
          {catName}が喜ぶかも…？<br />
        </p>

        <button
          className="karikari-confirm-btn"
          onClick={handleKarikariSend}
          disabled={loading}
        >
          {loading ? 'あげてる…🌀' : '🍪 カリカリをあげる！'}
        </button>
        <button className="karikari-cancel-btn" onClick={onClose}>
          やっぱりやめる
        </button>
      </div>
    </div>
  );
}
