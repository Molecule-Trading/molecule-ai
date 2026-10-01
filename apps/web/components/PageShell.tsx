"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppChrome, frameClass } from "@/components/AppChrome";
import { loadSession } from "@/lib/desk";

export function PageShell({
  children,
  center = false,
}: {
  children: React.ReactNode;
  center?: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!loadSession()) router.replace("/login");
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col">
      <AppChrome />
      <div className={center ? `${frameClass} flex flex-1 flex-col` : `${frameClass} pb-16 pt-2`}>
        {children}
      </div>
    </div>
  );
}
