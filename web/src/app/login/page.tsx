'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')

    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setMessage('Check your email for the magic link!')
      } else {
        setStatus('error')
        setMessage(data.error)
      }
    } catch {
      setStatus('error')
      setMessage('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8 backdrop-blur-sm">
          <div className="mb-8 text-center">
            <a href="/" className="inline-flex items-center gap-2">
              <span className="text-3xl">🛡️</span>
              <span className="text-2xl font-bold text-white">Kitha</span>
            </a>
            <p className="mt-2 text-slate-400">Sign in to your account</p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-red-500/20 p-4 text-sm text-red-400">
              {error === 'invalid_token' && 'Invalid or expired magic link.'}
              {error === 'Magic link expired' && 'This magic link has expired. Please request a new one.'}
              {error === 'Magic link already used' && 'This magic link has already been used.'}
              {!['invalid_token', 'Magic link expired', 'Magic link already used'].includes(error) && error}
            </div>
          )}

          {status === 'success' ? (
            <div className="text-center">
              <div className="mb-4 text-5xl">✉️</div>
              <h2 className="mb-2 text-xl font-semibold text-white">Check your email</h2>
              <p className="text-slate-400">
                We sent a magic link to <span className="font-medium text-white">{email}</span>.
                Click the link to sign in.
              </p>
              <button
                onClick={() => {
                  setStatus('idle')
                  setEmail('')
                }}
                className="mt-6 text-sm text-purple-400 transition hover:text-purple-300"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-xl bg-slate-900/50 px-4 py-3 text-white placeholder-slate-500 transition focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {message && status === 'error' && (
                <p className="text-sm text-red-400">{message}</p>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 py-3 font-semibold text-white transition hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
              >
                {status === 'loading' ? 'Sending...' : 'Send Magic Link'}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <span className="text-slate-400">One will be created automatically.</span>
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          <a href="/" className="transition hover:text-slate-400">
            ← Back to home
          </a>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
