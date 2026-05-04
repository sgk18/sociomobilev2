import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Required for Capacitor
  reactStrictMode: true,
  images: {
    unoptimized: true, // Required for static export
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  // Note: 'headers' are ignored during static export as they are handled by the web server (Capacitor handles this via capacitor.config.ts)
};

export default nextConfig;
