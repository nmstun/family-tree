'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow p-6 md:p-8">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 text-center">
          🌳 家系図アプリ
        </h1>
        <p className="text-sm text-gray-600 mb-6 text-center">
          メールアドレスにログイン用のリンクをお送りします
        </p>

        {status === 'sent' ? (
          <div className="text-center">
            <p className="text-sm text-gray-800 mb-2">
              <span className="font-medium">{email}</span> 宛にログインリンクを送信しました
            </p>
            <p className="text-xs text-gray-500">
              メール内のリンクをクリックするとログインできます
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm mb-4"
            />
            {status === 'error' && (
              <p className="text-xs text-red-600 mb-3">{errorMessage}</p>
            )}
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium text-sm disabled:opacity-50"
            >
              {status === 'sending' ? '送信中...' : 'ログインリンクを送る'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
