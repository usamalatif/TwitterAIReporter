'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface UserData {
  id: string
  email: string
  subscription: 'free' | 'pro'
  apiKey: string
  createdAt: string
  subscriptionStatus?: 'active' | 'canceled' | 'past_due'
  currentPeriodEnd?: string
  usage: {
    today: { scanCount: number; aiDetected: number }
    total: { scanCount: number; aiDetected: number }
  }
}

function DashboardContent() {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showApiKey, setShowApiKey] = useState(false)
  const [copying, setCopying] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/user')
      if (res.status === 401) {
        router.push('/login')
        return
      }
      const data = await res.json()
      setUser(data)
    } catch {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action: string) => {
    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      const data = await res.json()

      if (action === 'regenerate-api-key') {
        setUser(prev => prev ? { ...prev, apiKey: data.apiKey } : null)
      } else if (action === 'create-checkout' || action === 'manage-billing') {
        window.location.href = data.url
      } else if (action === 'logout') {
        router.push('/')
      }
    } catch (error) {
      console.error('Action failed:', error)
    }
  }

  const copyApiKey = async () => {
    if (!user) return
    setCopying(true)
    await navigator.clipboard.writeText(user.apiKey)
    setTimeout(() => setCopying(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!user) return null

  const isPro = user.subscription === 'pro' && user.subscriptionStatus === 'active'
  const freeLimit = 50
  const usagePercent = Math.min((user.usage.today.scanCount / freeLimit) * 100, 100)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2">
            <span className="text-2xl">🛡️</span>
            <span className="text-xl font-bold text-white">Kitha</span>
          </a>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">{user.email}</span>
            <button
              onClick={() => handleAction('logout')}
              className="rounded-lg bg-slate-700/50 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-10">
        {/* Success/Canceled Messages */}
        {success && (
          <div className="mb-6 rounded-xl bg-green-500/20 p-4 text-green-400">
            🎉 Welcome to Kitha Pro! Your subscription is now active.
          </div>
        )}
        {canceled && (
          <div className="mb-6 rounded-xl bg-yellow-500/20 p-4 text-yellow-400">
            Checkout was canceled. You can upgrade anytime.
          </div>
        )}

        <h1 className="mb-8 text-3xl font-bold text-white">Dashboard</h1>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Subscription Card */}
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm">
            <h2 className="mb-4 text-lg font-semibold text-white">Subscription</h2>
            <div className="mb-4">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
                isPro
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-slate-600/50 text-slate-300'
              }`}>
                {isPro ? '⭐ Pro' : 'Free'}
              </span>
            </div>
            {isPro ? (
              <>
                <p className="mb-4 text-sm text-slate-400">
                  Renews on {new Date(user.currentPeriodEnd!).toLocaleDateString()}
                </p>
                <button
                  onClick={() => handleAction('manage-billing')}
                  className="w-full rounded-xl border border-slate-600 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  Manage Billing
                </button>
              </>
            ) : (
              <>
                <p className="mb-4 text-sm text-slate-400">
                  Upgrade to Pro for unlimited scans
                </p>
                <button
                  onClick={() => handleAction('create-checkout')}
                  className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 py-2 text-sm font-semibold text-white transition hover:from-purple-600 hover:to-pink-600"
                >
                  Upgrade to Pro - $9/month
                </button>
              </>
            )}
          </div>

          {/* Usage Card */}
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm">
            <h2 className="mb-4 text-lg font-semibold text-white">Today&apos;s Usage</h2>
            <div className="mb-2 flex items-end justify-between">
              <span className="text-3xl font-bold text-white">{user.usage.today.scanCount}</span>
              {!isPro && <span className="text-sm text-slate-400">/ {freeLimit} scans</span>}
            </div>
            {!isPro && (
              <div className="mb-4">
                <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className={`h-full transition-all ${
                      usagePercent >= 100 ? 'bg-red-500' : usagePercent >= 80 ? 'bg-yellow-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                {usagePercent >= 100 && (
                  <p className="mt-2 text-sm text-red-400">Daily limit reached</p>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
              <div>
                <p className="text-sm text-slate-400">AI Detected</p>
                <p className="text-xl font-semibold text-white">{user.usage.today.aiDetected}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Scans</p>
                <p className="text-xl font-semibold text-white">{user.usage.total.scanCount}</p>
              </div>
            </div>
          </div>

          {/* API Key Card */}
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm">
            <h2 className="mb-4 text-lg font-semibold text-white">API Key</h2>
            <p className="mb-4 text-sm text-slate-400">
              Use this key in the Chrome extension to authenticate.
            </p>
            <div className="mb-4 flex items-center gap-2">
              <code className="flex-1 overflow-hidden rounded-lg bg-slate-900/50 px-3 py-2 font-mono text-sm text-slate-300">
                {showApiKey ? user.apiKey : '••••••••••••••••••••••••••••••••'}
              </code>
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="rounded-lg bg-slate-700 p-2 text-slate-300 transition hover:bg-slate-600"
                title={showApiKey ? 'Hide' : 'Show'}
              >
                {showApiKey ? '🙈' : '👁️'}
              </button>
              <button
                onClick={copyApiKey}
                className="rounded-lg bg-slate-700 p-2 text-slate-300 transition hover:bg-slate-600"
                title="Copy"
              >
                {copying ? '✓' : '📋'}
              </button>
            </div>
            <button
              onClick={() => {
                if (confirm('Regenerate API key? Your current key will stop working.')) {
                  handleAction('regenerate-api-key')
                }
              }}
              className="w-full rounded-xl border border-slate-600 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700"
            >
              Regenerate Key
            </button>
          </div>
        </div>

        {/* Extension Setup */}
        <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-lg font-semibold text-white">Chrome Extension Setup</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-2 font-medium text-white">1. Install the Extension</h3>
              <p className="mb-4 text-sm text-slate-400">
                Download Kitha from the Chrome Web Store.
              </p>
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
              >
                <span>🌐</span> Chrome Web Store
              </a>
            </div>
            <div>
              <h3 className="mb-2 font-medium text-white">2. Enter Your API Key</h3>
              <p className="text-sm text-slate-400">
                Click the Kitha icon in your browser, then paste your API key in the settings.
                The extension will automatically start detecting AI-generated tweets.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
