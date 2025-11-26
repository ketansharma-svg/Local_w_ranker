import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*",
        pathname: "/**",
      },
    ],
  },
  reactStrictMode: false,
    compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
