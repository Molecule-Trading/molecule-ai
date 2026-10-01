"use client";

import { AppChrome, frameClass } from "@/components/AppChrome";

export function PageShell({
  children,
  center = false,
}: {
  children: React.ReactNode;
  center?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppChrome />
      <div className={center ? `${frameClass} flex flex-1 flex-col` : `${frameClass} pb-16 pt-2`}>
        {children}
      </div>
    </div>
  );
}
