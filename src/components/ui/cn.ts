// Tailwindのクラス名を条件付きで連結する最小限のヘルパー。
// falsy な値は除外するので `cond && 'class'` をそのまま渡せる。
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
