/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // INI PENTING!
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mfymrinerlgzygnoimve.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.vercel.app',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.up.railway.app',
        pathname: '/**',
      }
    ],
  },
  // Add this for Railway
  experimental: {
    outputFileTracingRoot: process.cwd(),
  }
}

module.exports = nextConfig