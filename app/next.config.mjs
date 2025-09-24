/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["learnablemeta.com"],
  },
  // Cloudflare Pages compatibility
  trailingSlash: true,
  // Use Edge Runtime for API routes (required for Cloudflare)
  experimental: {
    runtime: 'edge',
  },
  // Static export configuration (alternative deployment option)
  output: process.env.CLOUDFLARE_STATIC ? 'export' : undefined,
  distDir: process.env.CLOUDFLARE_STATIC ? 'out' : '.next',
};

export default nextConfig;
