import type { Metadata } from "next";
import Link from "next/link";
import { sortedPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Blog — AI Detection on Twitter/X | Kitha",
  description:
    "Guides on detecting AI-generated tweets and content on Twitter/X — how detection works, the telltale signs, and the best tools.",
  alternates: { canonical: "/blog" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogIndex() {
  return (
    <div>
      <header className="mb-12">
        <h1 className="text-4xl font-extrabold text-white">Kitha Blog</h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-300">
          Guides on spotting AI-generated content on Twitter/X — how detection
          works, what to look for, and the tools that do it for you.
        </p>
      </header>

      <div className="space-y-6">
        {sortedPosts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="block rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-white/20 hover:bg-white/10"
          >
            <p className="text-sm text-slate-400">{formatDate(post.date)}</p>
            <h2 className="mt-1 text-xl font-bold text-white">{post.title}</h2>
            <p className="mt-2 text-slate-300">{post.description}</p>
            <span className="mt-3 inline-block font-semibold text-[#F97316]">
              Read more →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
