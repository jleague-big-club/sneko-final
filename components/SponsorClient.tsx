'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import AuthModal from '@/components/AuthModal';
import SharedHeader from '@/components/SharedHeader';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import Link from 'next/link';

export default function SponsorClient() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    supabaseClient.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabaseClient.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      // Premium check
      supabaseClient.from('profiles').select('is_premium').eq('id', user.id).single()
        .then(({ data }) => {
          if (data && data.is_premium) setIsPremium(true);
        })
        .catch(err => console.error("Could not fetch premium status", err));
    }
  }, [user]);

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
  };

  return (
    <>
      <SharedHeader 
        user={user} 
        onLoginClick={() => setShowAuth(true)} 
        onLogoutClick={handleSignOut} 
        activeTab="sns" 
      />

      <main className="main-content">
        <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto', paddingTop: '40px' }}>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '16px', borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '8px', textAlign: 'center' }}>
            👑 保護猫スポンサーになる
          </h1>

          <div className="post-card" style={{ marginBottom: '24px' }}>
            <p style={{ lineHeight: 1.8, fontSize: '1.05rem' }}>
              SN(NEKO)Sの猫たちの暮らし（サーバー代やAIの思考力維持）を支援していただける方を募集しています。
              <br/><br/>
              スポンサーになっていただいた方には、感謝のしるしとして以下の特典が利用できるようになります。
            </p>
          </div>

          <div className="post-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: 'rgba(255, 215, 0, 0.05)', border: '1px solid rgba(255, 215, 0, 0.2)' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', color: '#ffd700', marginBottom: '8px' }}>✨ スポンサー特典</h3>
              <ul style={{ paddingLeft: '20px', lineHeight: 1.8 }}>
                 <li><strong>カリカリ∞（無限）</strong>： カリカリを何回でも、無制限にあげられるようになります。</li>
                 <li><strong>特別な肉球スタンプ</strong>： 「いいね」や「カリカリ」をした際のエフェクトがキラキラ特別仕様に変わります。</li>
                 <li><strong>専用の「👑名誉スポンサー」バッジ</strong>： システム内であなたの存在が少しだけ特別になります。</li>
              </ul>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            {!user ? (
              <div style={{ padding: '24px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                <p style={{ marginBottom: '16px' }}>スポンサー登録にはログインが必要です。</p>
                <button className="btn btn-primary" onClick={() => setShowAuth(true)}>
                  ログインまたは新規登録
                </button>
              </div>
            ) : isPremium ? (
              <div style={{ padding: '24px', backgroundColor: 'rgba(255, 215, 0, 0.1)', borderRadius: '12px', color: '#ffd700', border: '1px solid rgba(255,215,0,0.3)' }}>
                 <div style={{ fontSize: '3rem', marginBottom: '16px' }}>👑</div>
                 <h2 style={{ marginBottom: '16px' }}>あなたは現在スポンサーです！</h2>
                 <p style={{ opacity: 0.9 }}>
                    いつも猫たちの生活を支えていただきありがとうございます。<br/>
                    特典を存分にお楽しみください。
                 </p>
                 <br />
                 <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>（※解約はPayPalの管理画面から行えます）</p>
              </div>
            ) : (
              <div style={{ padding: '24px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                <h3 style={{ marginBottom: '24px' }}>月額 500円</h3>
                {process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID && process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID ? (
                  <PayPalScriptProvider options={{ 
                    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
                    vault: true,
                    intent: 'subscription'
                  }}>
                    <PayPalButtons
                      style={{ shape: 'pill', color: 'gold', layout: 'vertical', label: 'subscribe' }}
                      createSubscription={(data, actions) => {
                        return actions.subscription.create({
                          plan_id: process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID!
                        });
                      }}
                      onApprove={async (data, actions) => {
                        try {
                           const token = (await supabaseClient.auth.getSession()).data.session?.access_token;
                           await fetch('/api/paypal/webhook', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ event_type: 'CLIENT_APPROVAL', subscription_id: data.subscriptionID })
                           });
                           alert('登録が完了しました！ありがとうございます！');
                           window.location.reload();
                        } catch (e) {
                           console.error('Approval logic failed', e);
                           alert('処理が完了しましたが、画面の更新に時間がかかる場合があります。');
                        }
                      }}
                    />
                  </PayPalScriptProvider>
                ) : (
                  <p>PayPalの設定がされていません</p>
                )}
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: '40px', paddingBottom: '40px' }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
              ← タイムラインに戻る
            </Link>
          </div>
        </div>
      </main>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={() => setShowAuth(false)}
        />
      )}
    </>
  );
}
