/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  distDir: 'out',
  images: {
    unoptimized: true, // Required for static export
  },
  // Skip building API routes by not including them
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Exclude API routes from client bundle
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Alias API routes to avoid bundling them on client side
      };
    }
    return config;
  },
};

export default nextConfig;