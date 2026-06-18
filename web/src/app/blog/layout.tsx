import Link from "next/link";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-slate-100">
      {/* Nav */}
      <nav className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/icon.svg" alt="Kitha AI Tweet Detector" className="h-8 w-8" />
            <span className="text-xl font-extrabold">
              <span className="text-white">kith</span>
              <span className="text-[#F97316]">a</span>
            </span>
          </Link>
          <div className="flex items-center gap-6 text-sm font-medium text-slate-300">
            <Link href="/blog" className="hover:text-white">
              Blog
            </Link>
            <a
              href="https://chromewebstore.google.com/detail/kitha-ai-tweet-detector/idlmbjjhhlhbomgepbbhgmfnllekfhbd"
              className="rounded-lg bg-[#F97316] px-4 py-2 font-semibold text-white hover:bg-orange-600"
            >
              Add to Chrome
            </a>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="container mx-auto px-6 pb-24 pt-6">
        <article className="prose-kitha mx-auto max-w-3xl">{children}</article>

        {/* CTA */}
        <div className="mx-auto mt-16 max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <h2 className="text-2xl font-bold text-white">
            Spot AI tweets automatically
          </h2>
          <p className="mt-2 text-slate-300">
            Kitha adds an AI-or-human badge to every post in your X feed. Free to
            use, 95.6% accuracy.
          </p>
          <a
            href="https://chromewebstore.google.com/detail/kitha-ai-tweet-detector/idlmbjjhhlhbomgepbbhgmfnllekfhbd"
            className="mt-5 inline-block rounded-lg bg-[#F97316] px-6 py-3 font-semibold text-white hover:bg-orange-600"
          >
            Add Kitha to Chrome
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="container mx-auto flex flex-col items-center gap-3 px-6 text-sm text-slate-400 sm:flex-row sm:justify-between">
          <span>© 2026 Kitha. All rights reserved.</span>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <a href="https://x.com/OrdinaryWeb3Dev" className="hover:text-white">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
