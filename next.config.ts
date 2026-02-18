import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "text-readability", "@anthropic-ai/sdk"],
};

export default nextConfig;
