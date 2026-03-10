/** @type {import('next').NextConfig} */

const nextConfig = {

  images: {
    domains: [
      "firebasestorage.googleapis.com"
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },

  reactStrictMode: true,
  compress: true,

  async rewrites() {
    return [
      {
        source: "/admin",
        destination: "/app-admin/admin/dashboard"
      },
      {
        source: "/admin/:path*",
        destination: "/app-admin/admin/:path*"
      }
    ]
  }

}

module.exports = nextConfig