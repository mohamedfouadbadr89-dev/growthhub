import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/decisions/history",
        destination: "/automation/history",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
