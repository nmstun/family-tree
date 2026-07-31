'use client'

import { cn } from './cn'

// 画面内のまとまりに付ける見出し。
// 同じ字面の <h2>/<h3> が各画面に散らばっていたのでここに寄せる。
interface SectionHeadingProps {
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
  as?: 'h2' | 'h3'
}

export default function SectionHeading({
  icon,
  children,
  className,
  as: Tag = 'h2',
}: SectionHeadingProps) {
  return (
    <Tag
      className={cn(
        'mb-2.5 flex items-center gap-1.5 text-[15px] font-semibold tracking-tight text-neutral-900',
        '[&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-neutral-400',
        className
      )}
    >
      {icon}
      {children}
    </Tag>
  )
}
