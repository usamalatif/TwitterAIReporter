import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent trailing slash redirects (important for webhooks)
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
