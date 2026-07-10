-- 家系図への招待 UI のためのサーバー側関数
--
-- auth.users はクライアントから直接 select できないため、
-- メールアドレスでの招待・共同編集者一覧の email 表示は
-- security definer 関数経由で行う。

-- ============================================================
-- 1. 家系図の共同編集者一覧を email 付きで取得
-- ============================================================
create or replace function list_tree_collaborators(p_tree_id uuid)
returns table (
  user_id uuid,
  email text,
  role text,
  added_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not exists (
    select 1 from family_tree_members ftm
    where ftm.tree_id = p_tree_id and ftm.user_id = auth.uid()
  ) then
    raise exception 'この家系図のメンバーではありません';
  end if;

  return query
    select ftm.user_id, au.email::text, ftm.role, ftm.added_at
    from family_tree_members ftm
    join auth.users au on au.id = ftm.user_id
    where ftm.tree_id = p_tree_id
    order by ftm.added_at asc;
end;
$$;

-- ============================================================
-- 2. メールアドレス指定でオーナーが編集権限を招待
--    （相手が未登録の場合は auth.users に見つからずエラーになる）
-- ============================================================
create or replace function invite_collaborator(p_tree_id uuid, p_email text)
returns table (
  user_id uuid,
  email text,
  role text,
  added_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  target_user_id uuid;
begin
  if not exists (
    select 1 from family_tree_members ftm
    where ftm.tree_id = p_tree_id and ftm.user_id = auth.uid() and ftm.role = 'owner'
  ) then
    raise exception 'オーナーのみが共同編集者を招待できます';
  end if;

  select au.id into target_user_id
  from auth.users au
  where lower(au.email) = lower(trim(p_email))
  limit 1;

  if target_user_id is null then
    raise exception 'このメールアドレスのユーザーが見つかりません。招待する相手に、先にログインリンクで一度サインインしてもらってください。';
  end if;

  insert into family_tree_members (tree_id, user_id, role)
  values (p_tree_id, target_user_id, 'editor')
  on conflict (tree_id, user_id) do nothing;

  return query
    select ftm.user_id, au.email::text, ftm.role, ftm.added_at
    from family_tree_members ftm
    join auth.users au on au.id = ftm.user_id
    where ftm.tree_id = p_tree_id and ftm.user_id = target_user_id;
end;
$$;

revoke execute on function list_tree_collaborators(uuid) from public;
revoke execute on function invite_collaborator(uuid, text) from public;
grant execute on function list_tree_collaborators(uuid) to authenticated;
grant execute on function invite_collaborator(uuid, text) to authenticated;

-- ============================================================
-- 3. オーナー行を誤って削除できないよう RLS を絞る
--    （オーナーの離脱・移譲は今回のスコープ外）
-- ============================================================
drop policy if exists "owner can remove collaborators" on family_tree_members;
create policy "owner can remove editors"
  on family_tree_members for delete
  using (
    role = 'editor'
    and tree_id in (select tree_id from family_tree_members where user_id = auth.uid() and role = 'owner')
  );
