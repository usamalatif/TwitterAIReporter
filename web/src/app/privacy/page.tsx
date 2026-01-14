export default function PrivacyPolicy() {
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
          <a
            href="/"
            className="rounded-lg bg-slate-700/50 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
          >
            Back to Home
          </a>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-8 text-4xl font-bold text-white">Privacy Policy</h1>
          <p className="mb-8 text-slate-400">Last updated: January 2025</p>

          <div className="space-y-8 text-slate-300">
            <section>
              <h2 className="mb-4 text-2xl font-semibold text-white">1. Introduction</h2>
              <p>
                Kitha (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our Chrome extension and web service for detecting AI-generated tweets.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-white">2. Information We Collect</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-lg font-medium text-white">Account Information</h3>
                  <p>When you create an account, we collect your email address for authentication via magic link login.</p>
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-medium text-white">Tweet Content</h3>
                  <p>
                    When you use our extension, we analyze the text content of tweets visible on your screen to determine if they are AI-generated. We do not store the full text of tweets. We only cache detection results (AI probability scores) temporarily to improve performance.
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-medium text-white">Usage Data</h3>
                  <p>We track the number of scans you perform daily for rate limiting purposes and to provide usage statistics in your dashboard.</p>
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-medium text-white">Payment Information</h3>
                  <p>
                    If you subscribe to Pro, payment processing is handled by Stripe. We do not store your credit card details. We only receive confirmation of your subscription status from Stripe.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-white">3. How We Use Your Information</h2>
              <ul className="list-disc space-y-2 pl-6">
                <li>To provide and maintain our AI detection service</li>
                <li>To authenticate you and manage your account</li>
                <li>To process subscription payments</li>
                <li>To enforce usage limits for free accounts</li>
                <li>To improve our AI detection algorithms</li>
                <li>To respond to your feedback and support requests</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-white">4. Data Storage and Security</h2>
              <p className="mb-4">
                Your data is stored securely using industry-standard encryption. We use:
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>PostgreSQL database hosted on Supabase for user accounts and usage data</li>
                <li>Redis for temporary caching of detection results (expires after 24 hours)</li>
                <li>HTTPS encryption for all data transmission</li>
                <li>Secure API keys for extension authentication</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-white">5. Data Sharing</h2>
              <p>
                We do not sell, trade, or rent your personal information to third parties. We may share data with:
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-6">
                <li><strong>Stripe:</strong> For payment processing (Pro subscriptions)</li>
                <li><strong>Resend:</strong> For sending magic link authentication emails</li>
                <li><strong>Infrastructure providers:</strong> Vercel, Railway, and Supabase for hosting services</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-white">6. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="mt-4 list-disc space-y-2 pl-6">
                <li>Access the personal data we hold about you</li>
                <li>Request deletion of your account and associated data</li>
                <li>Export your usage data</li>
                <li>Opt out of non-essential communications</li>
              </ul>
              <p className="mt-4">
                To exercise these rights, contact us via DM on X (Twitter) at{' '}
                <a href="https://x.com/OrdinaryWeb3Dev" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                  @OrdinaryWeb3Dev
                </a>
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-white">7. Cookies and Local Storage</h2>
              <p>
                We use cookies for session management (keeping you logged in). The Chrome extension uses local storage to save your API key securely in your browser.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-white">8. Children&apos;s Privacy</h2>
              <p>
                Kitha is not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-white">9. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-white">10. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us via DM on X (Twitter) at{' '}
                <a href="https://x.com/OrdinaryWeb3Dev" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                  @OrdinaryWeb3Dev
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="container mx-auto px-6 text-center text-sm text-slate-500">
          <p>&copy; 2025 Kitha. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
