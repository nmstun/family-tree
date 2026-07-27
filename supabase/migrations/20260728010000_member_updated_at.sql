-- 写真の再取得を減らすための updated_at 列
--
-- 写真は base64 のまま family_members.photo に入っているため、行を1件取得するだけで
-- 数十KBになる。Realtime の変更のたびに全メンバーを取り直すと、変わっていない写真まで
-- 毎回ダウンロードすることになり、人数が増えるほど重くなる（写真付き30人で約1.5MB）。
--
-- 「その行が最後に変更された時刻」が分かれば、クライアント側で写真をキャッシュし、
-- 変更のあった行の写真だけを取り直せるようになる。

alter table family_members
  add column if not exists updated_at timestamptz not null default now();

create or replace function touch_family_member_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_family_member_updated_at on family_members;
create trigger set_family_member_updated_at
  before update on family_members
  for each row execute function touch_family_member_updated_at();
