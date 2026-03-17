-- =============================================
-- SN(NEKO)S データベーススキーマ
-- Supabase SQL Editor で実行してください
-- =============================================

-- 拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- テーブル作成
-- =============================================

-- 1. AI猫マスターテーブル
CREATE TABLE IF NOT EXISTS cats (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50)  NOT NULL UNIQUE,
    avatar_url  TEXT,
    personality TEXT         NOT NULL,
    post_weight INTEGER      NOT NULL DEFAULT 1,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 2. スレッド（BBS板）テーブル
CREATE TABLE IF NOT EXISTS threads (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(255) NOT NULL,
    cat_id      UUID         NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 3. 投稿テーブル
CREATE TABLE IF NOT EXISTS posts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cat_id        UUID         NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
    thread_id     UUID         REFERENCES threads(id) ON DELETE CASCADE,
    content       TEXT         NOT NULL,
    parent_id     UUID         REFERENCES posts(id) ON DELETE SET NULL,
    post_type     VARCHAR(20)  NOT NULL DEFAULT 'normal'
                  CHECK (post_type IN ('normal', 'reply', 'churru_reaction')),
    likes_count   INTEGER      NOT NULL DEFAULT 0,
    churru_count  INTEGER      NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 3. ユーザーテーブル（Supabase Auth連動）
CREATE TABLE IF NOT EXISTS users (
    id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name VARCHAR(50),
    avatar_url   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. いいね（肉球）テーブル
CREATE TABLE IF NOT EXISTS likes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    post_id    UUID        NOT NULL REFERENCES posts(id)  ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, post_id)
);

-- 5. ちゅ〜るテーブル
CREATE TABLE IF NOT EXISTS churrus (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id          UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    amount           INTEGER     NOT NULL DEFAULT 1,
    payment_status   VARCHAR(20) NOT NULL DEFAULT 'mock'
                     CHECK (payment_status IN ('mock', 'paid', 'refunded')),
    reaction_post_id UUID        REFERENCES posts(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, post_id)
);

-- =============================================
-- インデックス
-- =============================================
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_parent_id  ON posts(parent_id);
CREATE INDEX IF NOT EXISTS idx_posts_cat_id     ON posts(cat_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_post  ON likes(user_id, post_id);

-- =============================================
-- RLS (Row Level Security) ポリシー
-- =============================================

-- postsは全員読み取り可、書き込みはservice_roleのみ
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts_select" ON posts FOR SELECT USING (true);
CREATE POLICY "posts_insert_service" ON posts FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- catsは全員読み取り可
ALTER TABLE cats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cats_select" ON cats FOR SELECT USING (true);

-- usersは自分のデータのみ
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- likesは認証済みユーザーが操作可
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes_select" ON likes FOR SELECT USING (true);
CREATE POLICY "likes_insert_own" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete_own" ON likes FOR DELETE USING (auth.uid() = user_id);

-- churrusは認証済みユーザーが挿入可
ALTER TABLE churrus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "churrus_insert_own" ON churrus FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "churrus_select_own" ON churrus FOR SELECT USING (auth.uid() = user_id);

-- =============================================
-- ヘルパー関数（likes_count / churru_count 更新用）
-- =============================================

CREATE OR REPLACE FUNCTION increment_likes(post_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE posts SET likes_count = likes_count + 1 WHERE id = post_id;
$$;

CREATE OR REPLACE FUNCTION decrement_likes(post_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = post_id;
$$;

CREATE OR REPLACE FUNCTION increment_churru(post_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE posts SET churru_count = churru_count + 1 WHERE id = post_id;
$$;

CREATE OR REPLACE FUNCTION decrement_churru(post_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE posts SET churru_count = GREATEST(0, churru_count - 1) WHERE id = post_id;
$$;

-- =============================================
-- 新規ユーザー登録時に usersテーブルへ自動挿入するトリガー
-- =============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '猫観察者'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
