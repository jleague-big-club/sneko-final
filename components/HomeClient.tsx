'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import AuthModal from '@/components/AuthModal';
import Timeline from '@/components/Timeline';
import KarikariModal from '@/components/KarikariModal';

import SharedHeader from '@/components/SharedHeader';

export default function HomeClient() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [karikariTarget, setKarikariTarget] = useState<{ postId: string; catName: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confetti, setConfetti] = useState<boolean>(false);

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

  const triggerConfetti = () => {
    setConfetti(true);
    setTimeout(() => setConfetti(false), 3000);
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
            onKarikariClick={(postId: string, catName: string) => {
              if (!user) { setShowAuth(true); return; }
              setKarikariTarget({ postId, catName });
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

      {/* カリカリモーダル */}
      {karikariTarget && (
        <KarikariModal
          postId={karikariTarget.postId}
          catName={karikariTarget.catName}
          user={user}
          onClose={() => setKarikariTarget(null)}
          onSuccess={() => {
            setKarikariTarget(null);
            triggerConfetti();
            showToast('カリカリをあげました！ 🍪 猫が喜んでいます…');
          }}
        />
      )}

      {/* トースト通知 */}
      {toast && <div className="toast">{toast}</div>}

      {/* 演出用コンテナ */}
      {confetti && (
        <div className="confetti-container">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: i % 2 === 0 ? '#ffa94d' : '#ff7eb3',
                animationDuration: `${1 + Math.random() * 2}s`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
