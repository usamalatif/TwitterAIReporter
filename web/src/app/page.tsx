import type { Metadata } from 'next'
import HomeSchema from '@/components/HomeSchema'
import { sortedPosts } from '@/lib/posts'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

// SVG Icon Components
const Icons = {
  robot: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2"/>
      <circle cx="12" cy="5" r="2"/>
      <path d="M12 7v4"/>
      <line x1="8" y1="16" x2="8" y2="16"/>
      <line x1="16" y1="16" x2="16" y2="16"/>
    </svg>
  ),
  human: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  download: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  twitter: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  tag: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  ),
  check: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <HomeSchema />
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/icon.svg" alt="Kitha" className="h-8 w-8" />
            <span className="text-xl font-extrabold">
              <span className="text-white">kith</span>
              <span className="text-[#F97316]">a</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/blog"
              className="px-2 py-2 text-sm font-medium text-slate-200 transition hover:text-white"
            >
              Blog
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-6 text-5xl font-bold leading-tight text-white md:text-6xl lg:text-7xl">
            Detect AI-Generated
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {' '}Tweets{' '}
            </span>
            Instantly
          </h1>

          <p className="mx-auto mb-6 max-w-2xl text-xl text-slate-300">
            Kitha helps you understand what&apos;s AI on X. Read our guides on spotting
            AI-generated tweets and bot replies — and how AI text detection actually works.
          </p>
          <p className="mx-auto mb-10 text-sm text-slate-400">
            Note: the Kitha Chrome extension is temporarily paused while we rebuild it.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="/blog"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 font-semibold text-white transition hover:from-purple-600 hover:to-pink-600"
            >
              Read the Blog
            </a>
            <a
              href="/blog/how-to-detect-ai-generated-tweets"
              className="rounded-xl border border-slate-600 px-8 py-4 font-semibold text-white transition hover:bg-slate-700"
            >
              How to Detect AI Tweets
            </a>
          </div>
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
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
                      {Icons.robot("h-3 w-3")} Vibed 94%
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
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
                      {Icons.human("h-3 w-3")} Human
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

      {/* Featured Guides */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="mb-4 text-center text-3xl font-bold text-white md:text-4xl">
          Guides
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-slate-400">
          Practical, evidence-based guides to spotting AI content on X.
        </p>
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          {sortedPosts.map((post) => (
            <a
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-white/20 hover:bg-white/10"
            >
              <h3 className="text-xl font-semibold text-white">{post.title}</h3>
              <p className="mt-2 text-slate-400">{post.description}</p>
              <span className="mt-3 inline-block font-semibold text-[#F97316]">
                Read more →
              </span>
            </a>
          ))}
        </div>
        <div className="mt-10 text-center">
          <a
            href="/blog"
            className="inline-block rounded-xl border border-slate-600 px-6 py-3 font-semibold text-white transition hover:bg-slate-700"
          >
            View all guides
          </a>
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
              How can I tell if a tweet is AI-generated?
            </h3>
            <p className="text-slate-400">
              Look for clusters of signs — uniform sentence rhythm, flawless punctuation,
              generic phrasing, and no personal voice. Our{' '}
              <a href="/blog/how-to-detect-ai-generated-tweets" className="text-[#F97316] hover:underline">
                detection guide
              </a>{' '}
              walks through every signal.
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-6 backdrop-blur-sm">
            <h3 className="mb-2 text-lg font-semibold text-white">
              How accurate are AI tweet detectors?
            </h3>
            <p className="text-slate-400">
              Useful but not perfect. Short text like tweets is the hardest to score, so any
              result is best read as a strong signal rather than proof. See our{' '}
              <a href="/blog/how-kitha-detects-ai-tweets" className="text-[#F97316] hover:underline">
                methodology &amp; accuracy
              </a>{' '}
              explainer.
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-6 backdrop-blur-sm">
            <h3 className="mb-2 text-lg font-semibold text-white">
              Is the Kitha browser extension available?
            </h3>
            <p className="text-slate-400">
              The extension is temporarily paused while we rebuild it. In the meantime, our
              guides cover how to spot AI tweets and bot replies yourself.
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-6 backdrop-blur-sm">
            <h3 className="mb-2 text-lg font-semibold text-white">
              Does Kitha store my data?
            </h3>
            <p className="text-slate-400">
              No. Kitha caches only anonymized detection results temporarily (24 hours) and
              never stores tweet content or personally identifiable information.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-3">
              <img src="/icon.svg" alt="Kitha" className="h-8 w-8" />
              <span className="text-xl font-extrabold">
                <span className="text-white">kith</span>
                <span className="text-[#F97316]">a</span>
              </span>
            </div>
            <div className="flex gap-6 text-sm text-slate-400">
              <a href="/privacy" className="transition hover:text-white">Privacy Policy</a>
              <a href="/terms" className="transition hover:text-white">Terms of Service</a>
              <a href="https://x.com/OrdinaryWeb3Dev" target="_blank" rel="noopener noreferrer" className="transition hover:text-white">Contact</a>
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
