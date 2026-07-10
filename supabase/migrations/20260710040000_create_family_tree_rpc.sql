-- INSERT ... RETURNING で family_trees に新規行を作成すると、
-- オーナー登録用の AFTER INSERT トリガー（on_family_tree_created）が
-- 実行される前に RETURNING 側の SELECT ポリシー（is_tree_member）の
-- WITH CHECK が評価されてしまい、新規ユーザーの最初の家系図作成が
-- 必ず "new row violates row-level security policy" で失敗していた
-- （招待機能の検証中に発覚した既存バグ）。
--
-- security definer 関数の中で作成とオーナー登録を完結させることで、
-- RLS を経由せずに新規作成できるようにする。
-- （トリガー自体は他経路からの直接 insert に備えて残す。
--   このRPCの insert は on conflict do nothing なのでトリガーと重複しても安全）

create or replace function create_family_tree(p_name text)
returns family_trees
language plpgsql
security definer
set search_path = public
as $$
declare
  new_tree family_trees;
begin
  if auth.uid() is null then
    raise exception '認証が必要です';
  end if;

  insert into family_trees (name) values (p_name) returning * into new_tree;

  insert into family_tree_members (tree_id, user_id, role)
  values (new_tree.id, auth.uid(), 'owner')
  on conflict (tree_id, user_id) do nothing;

  return new_tree;
end;
$$;

revoke execute on function create_family_tree(text) from public;
grant execute on function create_family_tree(text) to authenticated;
