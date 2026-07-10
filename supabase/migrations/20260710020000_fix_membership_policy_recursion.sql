-- family_tree_members の SELECT ポリシーが自テーブルを再帰的にサブクエリしており、
-- 「infinite recursion detected in policy for relation "family_tree_members"」で
-- 家系図の新規作成・読み込み自体が失敗していた（招待機能の検証中に発覚した既存バグ）。
-- security definer 関数でメンバーシップ判定を行い、RLS を経由させずに再帰を断ち切る。

create or replace function is_tree_member(p_tree_id uuid, p_role text default null)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from family_tree_members
    where tree_id = p_tree_id
      and user_id = auth.uid()
      and (p_role is null or role = p_role)
  );
$$;

revoke execute on function is_tree_member(uuid, text) from public;
grant execute on function is_tree_member(uuid, text) to authenticated;

-- --- family_trees ---
drop policy if exists "select own trees" on family_trees;
create policy "select own trees"
  on family_trees for select
  using (is_tree_member(id));

drop policy if exists "update own trees" on family_trees;
create policy "update own trees"
  on family_trees for update
  using (is_tree_member(id));

drop policy if exists "delete own trees (owner only)" on family_trees;
create policy "delete own trees (owner only)"
  on family_trees for delete
  using (is_tree_member(id, 'owner'));

-- --- family_tree_members ---
drop policy if exists "select collaborators of own trees" on family_tree_members;
create policy "select collaborators of own trees"
  on family_tree_members for select
  using (is_tree_member(tree_id));

drop policy if exists "owner can add collaborators" on family_tree_members;
create policy "owner can add collaborators"
  on family_tree_members for insert
  with check (is_tree_member(tree_id, 'owner'));

drop policy if exists "owner can remove editors" on family_tree_members;
create policy "owner can remove editors"
  on family_tree_members for delete
  using (role = 'editor' and is_tree_member(tree_id, 'owner'));

-- --- family_members / marriages / parent_child_relations ---
drop policy if exists "select members of own trees" on family_members;
create policy "select members of own trees"
  on family_members for select
  using (is_tree_member(tree_id));
drop policy if exists "modify members of own trees" on family_members;
create policy "modify members of own trees"
  on family_members for all
  using (is_tree_member(tree_id))
  with check (is_tree_member(tree_id));

drop policy if exists "select marriages of own trees" on marriages;
create policy "select marriages of own trees"
  on marriages for select
  using (is_tree_member(tree_id));
drop policy if exists "modify marriages of own trees" on marriages;
create policy "modify marriages of own trees"
  on marriages for all
  using (is_tree_member(tree_id))
  with check (is_tree_member(tree_id));

drop policy if exists "select relations of own trees" on parent_child_relations;
create policy "select relations of own trees"
  on parent_child_relations for select
  using (is_tree_member(tree_id));
drop policy if exists "modify relations of own trees" on parent_child_relations;
create policy "modify relations of own trees"
  on parent_child_relations for all
  using (is_tree_member(tree_id))
  with check (is_tree_member(tree_id));
