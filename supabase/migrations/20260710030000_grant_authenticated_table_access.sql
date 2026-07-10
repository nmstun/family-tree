-- ホストされた Supabase プロジェクトではプロジェクト作成時に
-- authenticated/anon ロールへのテーブル権限が自動付与されるが、
-- その付与はマイグレーション履歴に残らないため、ゼロから
-- `supabase db reset` したローカル環境では権限が欠落し、
-- RLS 以前に "permission denied for table ..." で弾かれてしまう。
-- 明示的に付与することでローカル/リモート双方を自己完結させる。
-- （GRANT は冪等なので、既に付与済みの環境に対して実行しても無害）

grant select, insert, update, delete on
  family_trees,
  family_tree_members,
  family_members,
  marriages,
  parent_child_relations
to authenticated;
