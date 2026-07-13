-- 古い世代ほど生年月日・没年月日が日単位までは分からないことが多いため、
-- 「年のみ」「年月まで」「年月日まで」のどの精度で分かっているかを保持する。
-- 既存行は今まで通り日単位の入力だったとみなし、デフォルトを 'day' にする。
alter table family_members
  add column if not exists birth_date_precision text not null default 'day'
    check (birth_date_precision in ('day', 'month', 'year')),
  add column if not exists death_date_precision text not null default 'day'
    check (death_date_precision in ('day', 'month', 'year'));
