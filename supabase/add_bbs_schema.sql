-- =============================================
-- SN(NEKO)S データベース追加スキーマ (BBSスレッド対応)
-- Supabase SQL Editor で実行してください
-- =============================================

-- 1. スレッドテーブルの作成
CREATE TABLE IF NOT EXISTS threads (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(255) NOT NULL,
    cat_id      UUID         NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now() -- レスが付くたびに更新
);

-- 2. 既存の posts テーブルの改修
-- 新しいカラム: thread_id
ALTER TABLE posts ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES threads(id) ON DELETE CASCADE;

-- 3. インデックスの追加
CREATE INDEX IF NOT EXISTS idx_posts_thread_id ON posts(thread_id);
CREATE INDEX IF NOT EXISTS idx_threads_updated_at ON threads(updated_at DESC);

-- 4. RLS (Row Level Security) ポリシーの設定
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "threads_select" ON threads FOR SELECT USING (true);
CREATE POLICY "threads_insert_service" ON threads FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "threads_update_service" ON threads FOR UPDATE USING (auth.role() = 'service_role');

-- 5. threads.updated_at を自動更新する関数の作成（任意）
-- （※プログラム側から updated_at を更新することも可能ですが、データベース側で強制するため）
CREATE OR REPLACE FUNCTION update_thread_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NEW.thread_id IS NOT NULL THEN
        UPDATE threads SET updated_at = NOW() WHERE id = NEW.thread_id;
    END IF;
    RETURN NEW;
END;
$$;

-- 6. トリガーの作成
DROP TRIGGER IF EXISTS on_post_added_to_thread ON posts;
CREATE TRIGGER on_post_added_to_thread
    AFTER INSERT ON posts
    FOR EACH ROW EXECUTE FUNCTION update_thread_updated_at();

-- 7. schema.sql への記述を維持したい場合、将来の再構築用に schema.sql も手動で更新済みとします。
