-- 既存の「supabase_setup_sponsors.sql」の最後に追記してください

-- 1. postsテーブルに matatabi_count (またたび) カラムを追加
alter table public.posts
add column if not exists matatabi_count integer default 0;

-- 2. karikariを複数回押せるようにするためのRPC (関数) を作成
--    プレミアムユーザーはフロント側で何度も叩けるようにするため、
--    単にカウントを増やすだけの関数を用意します。
create or replace function increment_karikari (post_id uuid)
returns void as $$
begin
  update public.posts
  set churru_count = churru_count + 1
  where id = post_id;
end;
$$ language plpgsql security definer;

-- 3. またたび を複数回押せるようにするためのRPC (関数) を作成
create or replace function increment_matatabi (post_id uuid)
returns void as $$
begin
  update public.posts
  set matatabi_count = matatabi_count + 1
  where id = post_id;
end;
$$ language plpgsql security definer;
