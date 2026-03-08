/** @type {import('next').NextConfig} */

const nextConfig = {

  images: {

    /* السماح لصور Firebase */

    domains: [
      "firebasestorage.googleapis.com"
    ],

    /* تحسين تحميل الصور */

    formats: ["image/avif", "image/webp"],

    /* منع layout shift */

    minimumCacheTTL: 60,

  },

  /* تحسين الأداء */

  reactStrictMode: true,

  /* ضغط الملفات */

  compress: true,

}

module.exports = nextConfig