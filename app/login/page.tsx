'use client'

import { useState } from 'react'
import { MailCheck, Network } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Alert, Button, Card, CONTROL_CLASS, LABEL_CLASS } from '@/components/ui'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    setErrorMessage('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
      return
    }

    setStatus('sent')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 text-white">
            <Network className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-neutral-900">家系図アプリ</h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              メールアドレスにログイン用のリンクをお送りします
            </p>
          </div>
        </div>

        <Card>
          {status === 'sent' ? (
            <div className="flex flex-col items-center gap-2 py-2 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <MailCheck className="h-5 w-5" aria-hidden />
              </span>
              <p className="text-sm text-neutral-900">
                <span className="font-medium">{email}</span> 宛に送信しました
              </p>
              <p className="text-[13px] text-neutral-500">
                メール内のリンクを開くとログインできます
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label htmlFor="login-email" className={LABEL_CLASS}>
                メールアドレス
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`${CONTROL_CLASS} mt-1.5`}
              />
              {status === 'error' && <Alert className="mt-2">{errorMessage}</Alert>}
              <Button type="submit" size="lg" fullWidth disabled={status === 'sending'} className="mt-4">
                {status === 'sending' ? '送信中...' : 'ログインリンクを送る'}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </main>
  )
}
