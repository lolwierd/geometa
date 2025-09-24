/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true, // Required for static export
  },
  // Skip building API routes during static export
  generateBuildId: async () => {
    return 'static-build';
  },
  // Disable server-side features for static export
  experimental: {
    // Remove any experimental features that require server
  },
};

export default nextConfig;
