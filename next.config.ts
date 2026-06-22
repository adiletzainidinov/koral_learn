import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // reactCompiler: true — disabled: babel-plugin-react-compiler@1.0.0 adds significant
  // overhead and caused instability with Turbopack on Node 24. Re-enable after upgrading
  // to a stable release of babel-plugin-react-compiler and verifying Node 24 support.
};

export default nextConfig;
