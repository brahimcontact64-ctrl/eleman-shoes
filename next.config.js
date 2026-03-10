/** @type {import('next').NextConfig} */

const nextConfig = {

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      }
    ]
  },

  reactStrictMode: true,
  compress: true,

}

module.exports = nextConfig