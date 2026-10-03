"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppChrome, frameClass } from "@/components/AppChrome";
import { SiteFooter } from "@/components/SiteFooter";

export function PageShell({
  children,
  center = false,
}: {
  children: React.ReactNode;
  center?: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => {
        if (!r.ok) router.replace("/login");
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col">
      <AppChrome />
      <div className={center ? `${frameClass} flex flex-1 flex-col` : `${frameClass} flex-1 pb-16 pt-2`}>{children}</div>
      <SiteFooter />
    </div>
  );
}
