"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function LiveBookingRefresh() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname !== "/admin" && !pathname.startsWith("/admin/agendamentos")) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [pathname, router]);

  return null;
}
