import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// まだログインしていない（=招待メールをまだ受け取っていないか見落としている）
// 相手に、招待メールを送り直すための API Route。
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

  const { data: membership } = await supabase
    .from('family_tree_members')
    .select('role')
    .eq('tree_id', treeId)
    .eq('user_id', user.id)
    .single()

  if (membership?.role !== 'owner') {
    return NextResponse.json({ error: 'オーナーのみが再送信できます' }, { status: 403 })
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

  return NextResponse.json({ data: { ok: true } })
}
