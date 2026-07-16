import createNextIntlPlugin from "next-intl/plugin";

const isDev = process.env.NODE_ENV !== "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["192.168.1.13", "localhost", "127.0.0.1"],

  onDemandEntries: {
    maxInactiveAge: 30_000,
    pagesBufferLength: 2
  },

  turbopack: {
    root: process.cwd()
  },

  images: {
    unoptimized: isDev,
    minimumCacheTTL: isDev ? 60 : 14_400,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.supabase.co" }
    ]
  }
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
