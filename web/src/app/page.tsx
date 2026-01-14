import { cookies } from 'next/headers'

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

export default async function LandingPage() {
  const cookieStore = await cookies()
  const isLoggedIn = !!cookieStore.get('session')?.value

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
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
          <a
            href={isLoggedIn ? "/dashboard" : "/login"}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            {isLoggedIn ? "Dashboard" : "Sign In"}
          </a>
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

          <p className="mx-auto mb-10 max-w-2xl text-xl text-slate-300">
            Kitha uses advanced AI to analyze tweets and show you which ones are
            likely written by AI. Stay informed about what you&apos;re reading on Twitter/X.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href={isLoggedIn ? "/dashboard" : "/login"}
              className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 font-semibold text-white transition hover:from-purple-600 hover:to-pink-600"
            >
              {isLoggedIn ? "Go to Dashboard" : "Get Started Free"}
            </a>
            <a
              href="#pricing"
              className="rounded-xl border border-slate-600 px-8 py-4 font-semibold text-white transition hover:bg-slate-700"
            >
              View Pricing
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
                      {Icons.robot("h-3 w-3")} AI 94%
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

      {/* How It Works */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold text-white md:text-4xl">
          How It Works
        </h2>
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
          <div className="rounded-2xl bg-white/5 p-6 text-center backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/20">
              {Icons.download("h-8 w-8 text-purple-400")}
            </div>
            <h3 className="mb-2 text-xl font-semibold text-white">1. Install Extension</h3>
            <p className="text-slate-400">
              Add Kitha to Chrome with one click. No configuration needed.
            </p>
          </div>
          <div className="rounded-2xl bg-white/5 p-6 text-center backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/20">
              {Icons.twitter("h-8 w-8 text-purple-400")}
            </div>
            <h3 className="mb-2 text-xl font-semibold text-white">2. Browse Twitter</h3>
            <p className="text-slate-400">
              Use Twitter/X normally. Kitha works silently in the background.
            </p>
          </div>
          <div className="rounded-2xl bg-white/5 p-6 text-center backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/20">
              {Icons.tag("h-8 w-8 text-purple-400")}
            </div>
            <h3 className="mb-2 text-xl font-semibold text-white">3. See AI Badges</h3>
            <p className="text-slate-400">
              Each tweet gets a badge showing if it&apos;s likely AI-generated or human-written.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container mx-auto px-6 py-20">
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
                {Icons.check("h-4 w-4 text-green-400")} 50 scans per day
              </li>
              <li className="flex items-center gap-2">
                {Icons.check("h-4 w-4 text-green-400")} AI detection badges
              </li>
              <li className="flex items-center gap-2">
                {Icons.check("h-4 w-4 text-green-400")} Basic support
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
              <span className="text-4xl font-bold text-white">$5</span>
              <span className="text-slate-400">/month</span>
            </div>
            <ul className="mb-8 space-y-3 text-slate-300">
              <li className="flex items-center gap-2">
                {Icons.check("h-4 w-4 text-purple-400")} Unlimited scans
              </li>
              <li className="flex items-center gap-2">
                {Icons.check("h-4 w-4 text-purple-400")} AI detection badges
              </li>
              <li className="flex items-center gap-2">
                {Icons.check("h-4 w-4 text-purple-400")} Priority support
              </li>
              <li className="flex items-center gap-2">
                {Icons.check("h-4 w-4 text-purple-400")} Early access to new features
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
