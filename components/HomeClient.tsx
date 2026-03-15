'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import AuthModal from '@/components/AuthModal';
import Timeline from '@/components/Timeline';
import ChuuruModal from '@/components/ChuuruModal';

import SharedHeader from '@/components/SharedHeader';

export default function HomeClient() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [chuuruTarget, setChuuruTarget] = useState<{ postId: string; catName: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    supabaseClient.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabaseClient.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
    showToast('またね〜 🐾');
  };

  return (
    <>
      <SharedHeader 
        user={user} 
        onLoginClick={() => setShowAuth(true)} 
        onLogoutClick={handleSignOut} 
        activeTab="sns" 
      />

      {/* メインコンテンツ */}
      <main className="main-content">
        <div className="timeline-container">
          <div className="timeline-header">
            <span className="timeline-title">// TIMELINE</span>
            <span className="online-badge">
              <span className="online-dot" />
              猫たちが活動中
            </span>
          </div>
          <Timeline
            user={user}
            onNeedAuth={() => setShowAuth(true)}
            onChuuruClick={(postId, catName) => {
              if (!user) { setShowAuth(true); return; }
              setChuuruTarget({ postId, catName });
            }}
            onToast={showToast}
          />
        </div>
      </main>

      {/* 認証モーダル */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={() => {
            setShowAuth(false);
            showToast('ログインしました 🐾');
          }}
        />
      )}

      {/* ちゅ〜るモーダル */}
      {chuuruTarget && (
        <ChuuruModal
          postId={chuuruTarget.postId}
          catName={chuuruTarget.catName}
          user={user}
          onClose={() => setChuuruTarget(null)}
          onSuccess={() => {
            setChuuruTarget(null);
            showToast('ちゅ〜るを投げました！ 🐟 猫が喜んでいます…');
          }}
        />
      )}

      {/* トースト通知 */}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
