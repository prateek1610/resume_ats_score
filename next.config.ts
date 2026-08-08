import type { NextConfig } from "next";
import { BASE_SECURITY_HEADERS, contentSecurityPolicy } from "./lib/security-headers";

const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: contentSecurityPolicy() },
        ...Object.entries(BASE_SECURITY_HEADERS).map(([key, value]) => ({ key, value })),
      ],
    }];
  },
};

export default nextConfig;
