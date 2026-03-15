'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const { error } = await supabaseClient.auth.getSession();
      if (error) {
        console.error('Auth callback error:', error.message);
      }
      // ログイン後はホーム（タイムライン）へ
      router.push('/');
    };

    handleCallback();
  }, [router]);

  return (
    <div className="loading-wrap" style={{ height: '100vh' }}>
      <div className="cat-spinner">🐾</div>
      <div className="loading-text">ログイン処理中…</div>
    </div>
  );
}
