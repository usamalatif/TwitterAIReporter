'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// SVG Icon Components
const Icons = {
  star: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  eye: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  eyeOff: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ),
  copy: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  ),
  check: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  globe: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  party: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.8 11.3 2 22l10.7-3.79"/>
      <path d="M4 3h.01"/>
      <path d="M22 8h.01"/>
      <path d="M15 2h.01"/>
      <path d="M22 20h.01"/>
      <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/>
      <path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17"/>
      <path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7"/>
      <path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/>
    </svg>
  ),
  gift: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12"/>
      <rect x="2" y="7" width="20" height="5"/>
      <line x1="12" y1="22" x2="12" y2="7"/>
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
    </svg>
  ),
  twitter: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  message: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  send: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
}

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
  const [feedback, setFeedback] = useState('')
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
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
          <a href="/" className="flex items-center gap-3">
            <img src="/icon.svg" alt="Kitha" className="h-8 w-8" />
            <span className="text-xl font-extrabold">
              <span className="text-white">kith</span>
              <span className="text-[#F97316]">a</span>
            </span>
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
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-green-500/20 p-4 text-green-400">
            {Icons.party("h-5 w-5")} Welcome to Kitha Pro! Your subscription is now active.
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
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                isPro
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-slate-600/50 text-slate-300'
              }`}>
                {isPro && Icons.star("h-4 w-4")} {isPro ? 'Pro' : 'Free'}
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
                {/* First 10 users promo banner */}
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 p-3 text-amber-400">
                  {Icons.gift("h-5 w-5")}
                  <span className="text-sm font-medium">First 10 users get 1 month FREE!</span>
                </div>
                <p className="mb-4 text-sm text-slate-400">
                  Upgrade to Pro for unlimited scans
                </p>
                <button
                  onClick={() => handleAction('create-checkout')}
                  className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 py-2 text-sm font-semibold text-white transition hover:from-purple-600 hover:to-pink-600"
                >
                  Upgrade to Pro - $5/month
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
                {showApiKey ? Icons.eyeOff("h-4 w-4") : Icons.eye("h-4 w-4")}
              </button>
              <button
                onClick={copyApiKey}
                className="rounded-lg bg-slate-700 p-2 text-slate-300 transition hover:bg-slate-600"
                title="Copy"
              >
                {copying ? Icons.check("h-4 w-4 text-green-400") : Icons.copy("h-4 w-4")}
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
                {Icons.globe("h-4 w-4")} Chrome Web Store
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

        {/* Feedback & Contact Section */}
        <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-lg font-semibold text-white">Feedback & Contact</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Feedback Form */}
            <div>
              <h3 className="mb-2 flex items-center gap-2 font-medium text-white">
                {Icons.message("h-4 w-4")} Share Your Feedback
              </h3>
              <p className="mb-4 text-sm text-slate-400">
                Help us improve Kitha! Let us know what you think.
              </p>
              {feedbackSubmitted ? (
                <div className="flex items-center gap-2 rounded-lg bg-green-500/20 p-4 text-green-400">
                  {Icons.check("h-5 w-5")}
                  <span>Thanks for your feedback!</span>
                </div>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    if (!feedback.trim()) return
                    setFeedbackSubmitting(true)
                    try {
                      await fetch('/api/feedback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ feedback, email: user.email }),
                      })
                      setFeedbackSubmitted(true)
                      setFeedback('')
                    } catch {
                      // Still show success - feedback can be reviewed later
                      setFeedbackSubmitted(true)
                    } finally {
                      setFeedbackSubmitting(false)
                    }
                  }}
                >
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="What do you like? What could be better?"
                    className="mb-3 h-24 w-full resize-none rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={feedbackSubmitting || !feedback.trim()}
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-medium text-white transition hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {Icons.send("h-4 w-4")} {feedbackSubmitting ? 'Sending...' : 'Send Feedback'}
                  </button>
                </form>
              )}
            </div>

            {/* Contact */}
            <div>
              <h3 className="mb-2 flex items-center gap-2 font-medium text-white">
                {Icons.twitter("h-4 w-4")} Contact Us
              </h3>
              <p className="mb-4 text-sm text-slate-400">
                Have questions or need help? Send us a DM on X (Twitter).
              </p>
              <a
                href="https://x.com/OrdinaryWeb3Dev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
              >
                {Icons.twitter("h-4 w-4")} @OrdinaryWeb3Dev
              </a>
              <p className="mt-3 text-xs text-slate-500">
                Follow for updates and announcements
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
