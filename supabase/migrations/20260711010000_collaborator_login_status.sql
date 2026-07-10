-- 招待した相手がまだログインしていないか確認できるように、
-- list_tree_collaborators の戻り値に last_sign_in_at を追加する。
-- 戻り値の列構成が変わるため create or replace ではなく一度 drop する。
drop function if exists list_tree_collaborators(uuid);

create or replace function list_tree_collaborators(p_tree_id uuid)
returns table (
  user_id uuid,
  email text,
  role text,
  added_at timestamptz,
  last_sign_in_at timestamptz
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
    select ftm.user_id, au.email::text, ftm.role, ftm.added_at, au.last_sign_in_at
    from family_tree_members ftm
    join auth.users au on au.id = ftm.user_id
    where ftm.tree_id = p_tree_id
    order by ftm.added_at asc;
end;
$$;

revoke execute on function list_tree_collaborators(uuid) from public;
grant execute on function list_tree_collaborators(uuid) to authenticated;
