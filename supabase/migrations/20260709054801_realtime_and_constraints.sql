-- 複数人リアルタイム編集のための補強

-- 1. family_members / marriages は主キーが id 単独のため、
--    デフォルトの REPLICA IDENTITY だと DELETE イベントに tree_id が
--    含まれず、Realtime の tree_id フィルタが効かない。
--    FULL にして削除時も全カラムを含めるようにする。
alter table family_members replica identity full;
alter table marriages replica identity full;

-- 2. 配偶者関係は (A, B) と (B, A) が別レコードとして重複登録されうるため、
--    順序に依存しないユニーク制約を追加する。
create unique index if not exists marriages_unique_pair_unordered
  on marriages (tree_id, least(spouse1_id, spouse2_id), greatest(spouse1_id, spouse2_id));
