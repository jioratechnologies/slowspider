import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  agentRules: false, // don't auto-generate AGENTS.md/CLAUDE.md into the repo
  output: "standalone",
  // npm workspaces root sits two levels up from apps/web — without this, Next's file
  // tracing for the standalone build can miss hoisted root node_modules (e.g.
  // packages/shared-types) and pick the wrong lockfile-inferred root.
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;
