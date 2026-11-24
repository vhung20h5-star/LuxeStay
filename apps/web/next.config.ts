import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@luxestay/contracts", "@luxestay/domain"],
  images: {
    // Vercel Services (Beta) routes frontend behind service rewrites without /_next/image optimizer;
    // Unsplash URLs already include Imgix CDN params (?auto=format&fit=crop&w=...&q=80).
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
