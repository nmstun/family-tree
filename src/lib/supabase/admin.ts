import { createClient } from '@supabase/supabase-js'

// service_role キーを使うサーバー専用クライアント。
// RLSを完全にバイパスするため、API Route など信頼できるサーバー環境以外では
// 絶対に使用しないこと（'use client' が付いたファイルから import しない）。
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
