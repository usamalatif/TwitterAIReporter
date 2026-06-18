import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  // Allow .mdx files to be treated as pages/routes
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
};

const withMDX = createMDX({
  // Add markdown plugins here if needed later (remark-gfm, etc.)
});

export default withMDX(nextConfig);
