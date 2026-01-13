'use client'

import { useState } from 'react'

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')

    try {
      const res = await fetch('/api/beta-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setMessage(data.message)
        setEmail('')
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛡️</span>
            <span className="text-xl font-bold text-white">Kitha</span>
          </div>
          <a
            href="/login"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            Sign In
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-purple-500/20 px-4 py-2 text-sm text-purple-300">
            <span className="animate-pulse">🚀</span>
            <span>Beta launching soon</span>
          </div>

          <h1 className="mb-6 text-5xl font-bold leading-tight text-white md:text-6xl lg:text-7xl">
            Detect AI-Generated
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {' '}Tweets{' '}
            </span>
            Instantly
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-xl text-slate-300">
            Kitha uses advanced AI to analyze tweets and show you which ones are
            likely written by AI. Stay informed about what you&apos;re reading on Twitter/X.
          </p>

          {/* Email Signup Form */}
          <form onSubmit={handleSubmit} className="mx-auto flex max-w-md flex-col gap-4 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="flex-1 rounded-xl bg-white/10 px-6 py-4 text-white placeholder-slate-400 backdrop-blur-sm transition focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 font-semibold text-white transition hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
            >
              {status === 'loading' ? 'Joining...' : 'Join Beta'}
            </button>
          </form>

          {message && (
            <p className={`mt-4 text-sm ${status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {message}
            </p>
          )}

          <p className="mt-4 text-sm text-slate-400">
            Join 100+ people waiting for launch. No spam, ever.
          </p>
        </div>
      </section>

      {/* Demo Preview */}
      <section className="container mx-auto px-6 py-10">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl bg-slate-800/50 shadow-2xl backdrop-blur-sm">
          <div className="border-b border-slate-700 bg-slate-800/80 px-4 py-3">
            <div className="flex gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500"></div>
              <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
              <div className="h-3 w-3 rounded-full bg-green-500"></div>
            </div>
          </div>
          <div className="p-6">
            {/* Mock Tweet 1 */}
            <div className="mb-4 rounded-xl bg-slate-900/50 p-4">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600"></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">Tech Influencer</span>
                    <span className="text-slate-400">@techguru</span>
                    <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
                      🤖 AI 94%
                    </span>
                  </div>
                  <p className="mt-2 text-slate-300">
                    The implementation of machine learning algorithms has revolutionized how we approach data processing. Here are 10 key insights...
                  </p>
                </div>
              </div>
            </div>

            {/* Mock Tweet 2 */}
            <div className="rounded-xl bg-slate-900/50 p-4">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-400 to-green-600"></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">Real Person</span>
                    <span className="text-slate-400">@actualhuman</span>
                    <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
                      ✍️ Human
                    </span>
                  </div>
                  <p className="mt-2 text-slate-300">
                    lol just spilled coffee all over my keyboard again 😅 third time this week someone help me
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold text-white md:text-4xl">
          How It Works
        </h2>
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
          <div className="rounded-2xl bg-white/5 p-6 text-center backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/20 text-3xl">
              📥
            </div>
            <h3 className="mb-2 text-xl font-semibold text-white">1. Install Extension</h3>
            <p className="text-slate-400">
              Add Kitha to Chrome with one click. No configuration needed.
            </p>
          </div>
          <div className="rounded-2xl bg-white/5 p-6 text-center backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/20 text-3xl">
              🐦
            </div>
            <h3 className="mb-2 text-xl font-semibold text-white">2. Browse Twitter</h3>
            <p className="text-slate-400">
              Use Twitter/X normally. Kitha works silently in the background.
            </p>
          </div>
          <div className="rounded-2xl bg-white/5 p-6 text-center backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/20 text-3xl">
              🏷️
            </div>
            <h3 className="mb-2 text-xl font-semibold text-white">3. See AI Badges</h3>
            <p className="text-slate-400">
              Each tweet gets a badge showing if it&apos;s likely AI-generated or human-written.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold text-white md:text-4xl">
          Simple Pricing
        </h2>
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
          {/* Free Plan */}
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8 backdrop-blur-sm">
            <h3 className="mb-2 text-2xl font-bold text-white">Free</h3>
            <p className="mb-6 text-slate-400">Perfect for casual users</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-white">$0</span>
              <span className="text-slate-400">/month</span>
            </div>
            <ul className="mb-8 space-y-3 text-slate-300">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> 50 scans per day
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> AI detection badges
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> Basic support
              </li>
            </ul>
            <button className="w-full rounded-xl border border-slate-600 py-3 font-semibold text-white transition hover:bg-slate-700">
              Get Started Free
            </button>
          </div>

          {/* Pro Plan */}
          <div className="relative rounded-2xl border-2 border-purple-500 bg-gradient-to-br from-purple-900/50 to-pink-900/50 p-8 backdrop-blur-sm">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-1 text-sm font-medium text-white">
              Most Popular
            </div>
            <h3 className="mb-2 text-2xl font-bold text-white">Pro</h3>
            <p className="mb-6 text-slate-400">For power users</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-white">$9</span>
              <span className="text-slate-400">/month</span>
            </div>
            <ul className="mb-8 space-y-3 text-slate-300">
              <li className="flex items-center gap-2">
                <span className="text-purple-400">✓</span> Unlimited scans
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-400">✓</span> AI detection badges
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-400">✓</span> Priority support
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-400">✓</span> Early access to new features
              </li>
            </ul>
            <button className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 py-3 font-semibold text-white transition hover:from-purple-600 hover:to-pink-600">
              Upgrade to Pro
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold text-white md:text-4xl">
          Frequently Asked Questions
        </h2>
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="rounded-xl bg-white/5 p-6 backdrop-blur-sm">
            <h3 className="mb-2 text-lg font-semibold text-white">
              How accurate is the AI detection?
            </h3>
            <p className="text-slate-400">
              Our model achieves 95.6% accuracy on our test dataset. It&apos;s trained on a large corpus
              of human and AI-generated text to reliably distinguish between the two.
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-6 backdrop-blur-sm">
            <h3 className="mb-2 text-lg font-semibold text-white">
              Does Kitha store my data?
            </h3>
            <p className="text-slate-400">
              We only store anonymized tweet IDs for caching purposes (24 hours). We never store
              the actual tweet content or any personally identifiable information.
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-6 backdrop-blur-sm">
            <h3 className="mb-2 text-lg font-semibold text-white">
              Can I use Kitha on mobile?
            </h3>
            <p className="text-slate-400">
              Currently, Kitha is only available as a Chrome extension for desktop. We&apos;re
              exploring mobile options for the future.
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-6 backdrop-blur-sm">
            <h3 className="mb-2 text-lg font-semibold text-white">
              What happens when I hit the free limit?
            </h3>
            <p className="text-slate-400">
              When you reach 50 scans per day, you can upgrade to Pro for unlimited scans, or
              wait until the next day when your limit resets.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🛡️</span>
              <span className="text-xl font-bold text-white">Kitha</span>
            </div>
            <div className="flex gap-6 text-sm text-slate-400">
              <a href="/privacy" className="transition hover:text-white">Privacy Policy</a>
              <a href="/terms" className="transition hover:text-white">Terms of Service</a>
              <a href="mailto:support@kitha.co" className="transition hover:text-white">Contact</a>
            </div>
            <p className="text-sm text-slate-500">
              © 2025 Kitha. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
