// Central registry of blog posts.
// Used by the blog index page and the sitemap so they stay in sync.
// When you add a new article (src/app/blog/<slug>/page.mdx), add an entry here.

export type Post = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO date published
  updated?: string; // ISO date last updated
};

export const posts: Post[] = [
  {
    slug: "how-to-detect-ai-generated-tweets",
    title: "How to Detect If a Tweet or X Post Is AI-Generated (2026)",
    description:
      "Learn how to tell if a tweet or X post was written by AI — the telltale signs, manual checks, and the detector tools that flag AI content automatically.",
    date: "2026-06-18",
    updated: "2026-06-18",
  },
  {
    slug: "signs-a-tweet-was-written-by-ai",
    title: "9 Signs a Tweet Was Written by AI (with Examples)",
    description:
      "The nine clearest signs a tweet was written by AI — with real before-and-after examples — so you can spot AI-generated posts on X at a glance.",
    date: "2026-06-18",
    updated: "2026-06-18",
  },
  {
    slug: "how-to-spot-ai-bot-replies-on-x",
    title: "How to Spot AI Bot Replies on X (2026 Guide)",
    description:
      "AI-generated reply bots have flooded X. Learn the behavioral signals that expose them — reply speed, account age, network patterns — and how to filter them out.",
    date: "2026-06-18",
    updated: "2026-06-18",
  },
  {
    slug: "best-ai-tweet-detectors",
    title: "Best AI Tweet Detectors for X in 2026 (Compared)",
    description:
      "A hands-on comparison of the best AI tweet detectors for X (Twitter) in 2026 — extensions and tools that flag AI-generated posts, with pros, cons, and pricing.",
    date: "2026-06-18",
    updated: "2026-06-18",
  },
  {
    slug: "how-kitha-detects-ai-tweets",
    title: "How Kitha Detects AI Tweets: Methodology & Accuracy",
    description:
      "How Kitha's AI tweet detection works, what its 95.6% accuracy figure means, and an honest look at the limits of detecting AI in short text like tweets.",
    date: "2026-06-18",
    updated: "2026-06-18",
  },
];

// Newest first
export const sortedPosts = [...posts].sort((a, b) => (a.date < b.date ? 1 : -1));

export const getPost = (slug: string) => posts.find((p) => p.slug === slug);
