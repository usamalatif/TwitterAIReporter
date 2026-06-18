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
];

// Newest first
export const sortedPosts = [...posts].sort((a, b) => (a.date < b.date ? 1 : -1));

export const getPost = (slug: string) => posts.find((p) => p.slug === slug);
