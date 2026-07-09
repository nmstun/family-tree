-- 家系図アプリ: 複数人編集対応スキーマ
-- テーブル構成:
--   family_trees            … 1つの家系図（複数の家族で共有可能）
--   family_tree_members     … その家系図を編集できるユーザーの一覧（アクセス制御）
--   family_members          … 家系図に登録された人物
--   marriages                … 配偶者関係
--   parent_child_relations  … 親子関係

create extension if not exists "pgcrypto" with schema extensions;

-- ============================================================
-- 1. family_trees（家系図本体）
-- ============================================================
create table if not exists family_trees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 2. family_tree_members（誰がこの家系図を編集できるか）
-- ============================================================
create table if not exists family_tree_members (
  tree_id uuid not null references family_trees(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  added_at timestamptz not null default now(),
  primary key (tree_id, user_id)
);

-- ============================================================
-- 3. family_members（人物）
-- ============================================================
create table if not exists family_members (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references family_trees(id) on delete cascade,
  last_name text not null,
  first_name text not null,
  birth_date date,
  death_date date,
  gender text not null default 'other' check (gender in ('male', 'female', 'other')),
  photo text, -- Base64 もしくは Storage の URL
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_family_members_tree_id on family_members(tree_id);

-- ============================================================
-- 4. marriages（配偶者関係）
-- ============================================================
create table if not exists marriages (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references family_trees(id) on delete cascade,
  spouse1_id uuid not null references family_members(id) on delete cascade,
  spouse2_id uuid not null references family_members(id) on delete cascade,
  marriage_date date,
  created_at timestamptz not null default now(),
  constraint marriages_distinct_spouses check (spouse1_id <> spouse2_id),
  constraint marriages_unique_pair unique (tree_id, spouse1_id, spouse2_id)
);

create index if not exists idx_marriages_tree_id on marriages(tree_id);

-- ============================================================
-- 5. parent_child_relations（親子関係）
-- ============================================================
create table if not exists parent_child_relations (
  tree_id uuid not null references family_trees(id) on delete cascade,
  parent_id uuid not null references family_members(id) on delete cascade,
  child_id uuid not null references family_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tree_id, parent_id, child_id),
  constraint parent_child_distinct check (parent_id <> child_id)
);

create index if not exists idx_relations_tree_id on parent_child_relations(tree_id);

-- ============================================================
-- 6. 家系図作成時に自動でオーナーとして登録するトリガー
-- ============================================================
create or replace function handle_new_family_tree()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into family_tree_members (tree_id, user_id, role)
  values (new.id, auth.uid(), 'owner');
  return new;
end;
$$;

drop trigger if exists on_family_tree_created on family_trees;
create trigger on_family_tree_created
  after insert on family_trees
  for each row execute function handle_new_family_tree();

-- ============================================================
-- 7. family_trees.updated_at を自動更新するトリガー
--    （メンバー・関係が変更されたときにも家系図側の updated_at を更新）
-- ============================================================
create or replace function touch_family_tree_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_tree_id uuid;
begin
  target_tree_id := coalesce(new.tree_id, old.tree_id);
  update family_trees set updated_at = now() where id = target_tree_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists touch_tree_on_member_change on family_members;
create trigger touch_tree_on_member_change
  after insert or update or delete on family_members
  for each row execute function touch_family_tree_updated_at();

drop trigger if exists touch_tree_on_marriage_change on marriages;
create trigger touch_tree_on_marriage_change
  after insert or update or delete on marriages
  for each row execute function touch_family_tree_updated_at();

drop trigger if exists touch_tree_on_relation_change on parent_child_relations;
create trigger touch_tree_on_relation_change
  after insert or update or delete on parent_child_relations
  for each row execute function touch_family_tree_updated_at();

-- ============================================================
-- 8. Row Level Security（自分が編集権限を持つ家系図のデータだけ操作できる）
-- ============================================================
alter table family_trees enable row level security;
alter table family_tree_members enable row level security;
alter table family_members enable row level security;
alter table marriages enable row level security;
alter table parent_child_relations enable row level security;

-- --- family_trees ---
create policy "select own trees"
  on family_trees for select
  using (
    id in (select tree_id from family_tree_members where user_id = auth.uid())
  );

create policy "insert trees when authenticated"
  on family_trees for insert
  with check (auth.uid() is not null);

create policy "update own trees"
  on family_trees for update
  using (
    id in (select tree_id from family_tree_members where user_id = auth.uid())
  );

create policy "delete own trees (owner only)"
  on family_trees for delete
  using (
    id in (select tree_id from family_tree_members where user_id = auth.uid() and role = 'owner')
  );

-- --- family_tree_members ---
create policy "select collaborators of own trees"
  on family_tree_members for select
  using (
    tree_id in (select tree_id from family_tree_members where user_id = auth.uid())
  );

create policy "owner can add collaborators"
  on family_tree_members for insert
  with check (
    tree_id in (select tree_id from family_tree_members where user_id = auth.uid() and role = 'owner')
  );

create policy "owner can remove collaborators"
  on family_tree_members for delete
  using (
    tree_id in (select tree_id from family_tree_members where user_id = auth.uid() and role = 'owner')
  );

-- --- family_members / marriages / parent_child_relations ---
-- 3テーブルとも同じルール: 自分が編集権限を持つ tree_id のデータだけ操作可能
create policy "select members of own trees"
  on family_members for select
  using (tree_id in (select tree_id from family_tree_members where user_id = auth.uid()));
create policy "modify members of own trees"
  on family_members for all
  using (tree_id in (select tree_id from family_tree_members where user_id = auth.uid()))
  with check (tree_id in (select tree_id from family_tree_members where user_id = auth.uid()));

create policy "select marriages of own trees"
  on marriages for select
  using (tree_id in (select tree_id from family_tree_members where user_id = auth.uid()));
create policy "modify marriages of own trees"
  on marriages for all
  using (tree_id in (select tree_id from family_tree_members where user_id = auth.uid()))
  with check (tree_id in (select tree_id from family_tree_members where user_id = auth.uid()));

create policy "select relations of own trees"
  on parent_child_relations for select
  using (tree_id in (select tree_id from family_tree_members where user_id = auth.uid()));
create policy "modify relations of own trees"
  on parent_child_relations for all
  using (tree_id in (select tree_id from family_tree_members where user_id = auth.uid()))
  with check (tree_id in (select tree_id from family_tree_members where user_id = auth.uid()));

-- ============================================================
-- 9. Realtime配信を有効化（他のクライアントへ変更を即時反映するため）
-- ============================================================
alter publication supabase_realtime add table family_members;
alter publication supabase_realtime add table marriages;
alter publication supabase_realtime add table parent_child_relations;
