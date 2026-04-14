/** @type {import('next').NextConfig} */

const nextConfig = {

  images: {
    domains: ['firebasestorage.googleapis.com', 'res.cloudinary.com'],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [320, 420, 640, 768, 1024, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  reactStrictMode: true,
  compress: true,

}

module.exports = nextConfig