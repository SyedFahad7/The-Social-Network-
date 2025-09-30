/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Enable hot reload in Docker containers - only in development
  ...(process.env.NODE_ENV === 'development' && {
    webpackDevMiddleware: config => {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
      return config
    }
  }),
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://backend:5000/api/:path*',
        },
      ];
    }
    return [];
  },
};

module.exports = nextConfig;
