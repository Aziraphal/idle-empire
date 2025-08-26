/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: false, // Using pages router for now
  },
  images: {
    domains: [
      'localhost',
      // Add image domains here as needed
    ],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Enable strict mode
  reactStrictMode: true,
  
  // Performance optimizations
  swcMinify: true,
  
  // Bundle analyzer (conditional)
  ...(process.env.ANALYZE === 'true' && {
    plugins: [
      require('@next/bundle-analyzer')({
        enabled: true,
      }),
    ],
  }),
}

module.exports = nextConfig