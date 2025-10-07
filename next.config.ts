import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'm-qa.atcdn.co.uk',
        port: '',
        pathname: '/a/media/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'atcdn.co.uk',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'm.atcdn.co.uk',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'rswnjaoaazxrrrymppnw.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      }
    ],
  },
  // Keep database and heavy dependencies server-side only
  serverExternalPackages: ['pg', 'postgres', 'drizzle-orm'],
};

export default nextConfig;
