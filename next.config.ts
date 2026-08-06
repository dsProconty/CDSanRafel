import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // El Excel del banco puede traer varios meses de movimientos.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
