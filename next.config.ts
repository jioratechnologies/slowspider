import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false, // don't auto-generate AGENTS.md/CLAUDE.md into the repo
};

export default nextConfig;
