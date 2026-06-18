import type { MDXComponents } from "mdx/types";

// Allows customizing built-in components for MDX content site-wide.
// Styling is handled by the `.prose-kitha` wrapper in the blog layout.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
  };
}
