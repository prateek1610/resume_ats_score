"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function AnalyticsBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin/")) return;
    const marker = `resumelens:view:${pathname}`;
    try {
      if (sessionStorage.getItem(marker)) return;
      sessionStorage.setItem(marker, "1");
    } catch {
      // Tracking remains best-effort when browser storage is unavailable.
    }

    void fetch("/api/analytics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pathname }),
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
