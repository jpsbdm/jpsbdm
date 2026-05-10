const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\/api\/transactions.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-transactions',
          expiration: { maxAgeSeconds: 300 },
          networkTimeoutSeconds: 10,
        },
      },
      {
        urlPattern: /^https:\/\/.*\/api\/.*/,
        handler: 'StaleWhileRevalidate',
        options: { cacheName: 'api-others' },
      },
    ],
  },
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
}

module.exports = withPWA(nextConfig)
