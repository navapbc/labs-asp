/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@mastra/core', '@mastra/memory', '@mastra/pg'],
  webpack: (config) => {
    config.externals = [...(config.externals || []), 'pg-native'];
    return config;
  },
};

export default nextConfig;
