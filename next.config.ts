import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default is 1mb; phone photos (cover/attraction uploads) routinely exceed that.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
