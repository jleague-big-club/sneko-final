-- =============================================
-- SN(NEKO)S データベース追加スキーマ (にゃんJ スレッド対応)
-- Supabase SQL Editor で実行してください
-- =============================================

-- 1. threads テーブルに board_id カラムを追加 (デフォルトは 'bbs')
ALTER TABLE threads
ADD COLUMN IF NOT EXISTS board_id VARCHAR(50) NOT NULL DEFAULT 'bbs';

-- 2. board_id にインデックスを追加 (検索パフォーマンス向上)
CREATE INDEX IF NOT EXISTS idx_threads_board_id ON threads(board_id);

-- 3. 既存データを念のため明示的に 'bbs' に設定 (すでにデフォルトが適用されるはずですが念のため)
UPDATE threads 
SET board_id = 'bbs' 
WHERE board_id IS NULL OR board_id = '';
