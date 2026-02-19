/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Google OAuth avatars
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      // GitHub OAuth avatars
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/**",
      },
      // Gravatar (common fallback)
      {
        protocol: "https",
        hostname: "*.gravatar.com",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
