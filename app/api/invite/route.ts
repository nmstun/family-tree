import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// 未登録のメールアドレスも招待できるようにするための API Route。
// invite_collaborator RPC はオーナー権限チェックとメンバー追加を担うが、
// auth.users に存在しないメールは弾かれるため、その場合だけ service_role の
// 管理者APIでユーザーを作成（招待メール送信）してから改めて RPC を呼び直す。
export async function POST(request: Request) {
  const { treeId, email } = await request.json()

  if (typeof treeId !== 'string' || typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ error: 'treeId と email は必須です' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const callInviteRpc = () =>
    supabase.rpc('invite_collaborator', { p_tree_id: treeId, p_email: email.trim() })

  const first = await callInviteRpc()
  if (!first.error) {
    return NextResponse.json({ data: first.data })
  }

  // 「見つかりません」以外のエラー（オーナーでない等）はそのまま返す
  if (!first.error.message.includes('見つかりません')) {
    return NextResponse.json({ error: first.error.message }, { status: 400 })
  }

  const { data: tree } = await supabase
    .from('family_trees')
    .select('name')
    .eq('id', treeId)
    .single()

  const admin = createAdminClient()
  const { origin } = new URL(request.url)
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email.trim(), {
    redirectTo: `${origin}/auth/callback`,
    data: {
      tree_name: tree?.name ?? '家系図',
      inviter_email: user.email,
    },
  })
  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 400 })
  }

  const second = await callInviteRpc()
  if (second.error) {
    return NextResponse.json({ error: second.error.message }, { status: 400 })
  }
  return NextResponse.json({ data: second.data })
}
