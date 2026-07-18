-- 利用ユーザーと家系図メンバー（登場人物）を紐づける機能
--
-- 家系図が大きくなるほど「自分がどこにいるか」が分かりにくくなるため、
-- ログインユーザーごとに「自分はこの人物」という対応を1家系図につき1件持てるようにする。
-- 用途: 家系図表示で自分のノードを強調し、開いたときに自分を起点に表示する。

alter table family_tree_members
  add column if not exists member_id uuid references family_members(id) on delete set null;

-- family_tree_members には現状 update 用の RLS ポリシーが存在しない
-- （role列を自分で書き換えてオーナー権限に昇格できてしまうのを防ぐため）。
-- member_id だけを自分の行に限定して更新できるよう、security definer 関数を
-- 経由させることでブランケットな update ポリシーを追加せずに対応する。
create or replace function set_self_member(p_tree_id uuid, p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception '認証が必要です';
  end if;

  if not exists (
    select 1 from family_tree_members ftm
    where ftm.tree_id = p_tree_id and ftm.user_id = auth.uid()
  ) then
    raise exception 'この家系図のメンバーではありません';
  end if;

  if p_member_id is not null and not exists (
    select 1 from family_members fm
    where fm.id = p_member_id and fm.tree_id = p_tree_id
  ) then
    raise exception '指定されたメンバーが見つかりません';
  end if;

  update family_tree_members
  set member_id = p_member_id
  where tree_id = p_tree_id and user_id = auth.uid();
end;
$$;

revoke execute on function set_self_member(uuid, uuid) from public;
grant execute on function set_self_member(uuid, uuid) to authenticated;
