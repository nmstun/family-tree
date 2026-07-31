import { FamilyMember } from '@/types'

// 氏名の組み立ては画面ごとに書かれていて、姓と名の区切り（半角スペース）や
// メンバーが見つからないときの表記がばらついていたため、ここにまとめる。

/** 「宮本 清」のように姓と名を並べる */
export function fullName(member: FamilyMember): string {
  return `${member.lastName} ${member.firstName}`
}

/**
 * 参照先のメンバーが見つからない場合も考慮した表示名。
 * 関係の一覧など、IDから引いて表示する箇所で使う。
 */
export function displayName(member?: FamilyMember): string {
  return member ? fullName(member) : '（不明なメンバー）'
}

/** アバターの頭文字などに使う、その人を代表する1文字 */
export function initial(member: FamilyMember): string {
  return (member.firstName || member.lastName).trim().charAt(0) || '?'
}
