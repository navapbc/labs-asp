import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
  distDir: 'dist',
  // Point to the src directory for the app
  dir: 'src',
};

export default nextConfig;
