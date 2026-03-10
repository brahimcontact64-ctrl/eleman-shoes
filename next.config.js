/** @type {import('next').NextConfig} */

const nextConfig = {

images: {
domains: [
"firebasestorage.googleapis.com",
"lh3.googleusercontent.com",
],
},

reactStrictMode: true,
compress: true,

}

module.exports = nextConfig