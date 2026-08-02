import { FamilyTree, ExportData } from '@/types'

export function exportToJSON(tree: FamilyTree): ExportData {
  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    tree,
  }
}

export function downloadJSON(data: ExportData, filename: string = 'family-tree.json') {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const hasStrings = (v: unknown, keys: string[]) =>
  isObject(v) && keys.every((k) => typeof v[k] === 'string' && v[k] !== '')

/**
 * インポート用のJSONを検証する。
 *
 * インポートは「既存のメンバーを全削除してから挿入する」処理なので、
 * 中途半端なデータを受け入れると家系図が壊れたまま残ってしまう。
 * 実際、以前は version / tree / exportedAt が「存在するか」しか見ておらず、
 * members はあるが marriages が無いJSONを読み込むと、
 * 全削除したあとで例外になり、メンバーだけが入った状態で止まっていた。
 * そのため、削除より前にここで構造をすべて確かめる。
 */
export function importJSON(json: string): ExportData | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (error) {
    console.error('Failed to parse JSON:', error)
    return null
  }

  if (!isObject(parsed)) return null
  if (typeof parsed.version !== 'string' || typeof parsed.exportedAt !== 'string') return null

  const tree = parsed.tree
  if (!isObject(tree)) return null
  if (typeof tree.id !== 'string' || typeof tree.name !== 'string') return null

  // 3つとも配列であることが必須。1つでも欠けていると挿入の途中で失敗する。
  const { members, marriages, parentChildRelations } = tree
  if (!Array.isArray(members) || !Array.isArray(marriages) || !Array.isArray(parentChildRelations))
    return null

  // 姓名は片方しか記録が無いこともあるため、空文字は許して型だけ見る
  const validMember = (m: unknown) =>
    hasStrings(m, ['id', 'gender']) &&
    isObject(m) &&
    typeof m.lastName === 'string' &&
    typeof m.firstName === 'string'
  if (!members.every(validMember)) return null
  if (!marriages.every((m) => hasStrings(m, ['id', 'spouse1Id', 'spouse2Id']))) return null
  if (!parentChildRelations.every((r) => hasStrings(r, ['parentId', 'childId']))) return null

  // 関係が指しているメンバーが実在すること。
  // 宙に浮いた関係が混ざっていると、メンバー挿入後の対応付けで
  // 存在しないIDを引いて失敗し、やはり中途半端な状態で終わる。
  const ids = new Set((members as Record<string, unknown>[]).map((m) => m.id as string))
  const known = (v: unknown) => typeof v === 'string' && ids.has(v)
  const refsOk =
    (marriages as Record<string, unknown>[]).every(
      (m) => known(m.spouse1Id) && known(m.spouse2Id)
    ) &&
    (parentChildRelations as Record<string, unknown>[]).every(
      (r) => known(r.parentId) && known(r.childId)
    )
  if (!refsOk) return null

  return parsed as unknown as ExportData
}
