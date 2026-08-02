/**
 * ログイン後に「どの家系図を開くか」の判断。
 *
 * ここを間違えると実害が大きい。所属ツリーの取得が失敗したときに
 * 「所属が無い」と扱ってしまうと、通信が一時的に切れただけで
 * 空の家系図を新規作成し、既存の家系図が見えなくなる
 * （実際に本番で既定名の空ツリーが2つ増えていた）。
 * 判断だけを純粋関数に切り出して、テストで固定する。
 */
export type TreeResolution =
  | { action: 'open'; treeId: string }
  | { action: 'create' }
  | { action: 'fail' }

export function resolveTreeToOpen(
  memberships: { tree_id: string }[] | null | undefined,
  error: unknown
): TreeResolution {
  // 取得に失敗した場合は「所属が無い」と区別できないため、何もしない
  if (error) return { action: 'fail' }
  // 取得できたが1件も無い場合だけが「本当に未所属」＝初回ログイン
  const treeId = memberships?.[0]?.tree_id
  if (!treeId) return { action: 'create' }
  return { action: 'open', treeId }
}
