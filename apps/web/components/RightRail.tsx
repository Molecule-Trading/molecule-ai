"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Chat } from "@/lib/desk";

const MENU = [
  { href: "/research", label: "Research" },
  { href: "/runs", label: "Strategies" },
  { href: "/settings", label: "Settings" },
];

export function RightRail({
  chats,
  activeId,
  onSelect,
  onNew,
}: {
  chats: Chat[];
  activeId?: string;
  onSelect?: (chat: Chat) => void;
  onNew?: () => void;
}) {
  const path = usePathname();
  return (
    <aside className="flex h-full w-full flex-col border-l border-line bg-ink-900 md:w-72">
      <div className="border-b border-line px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-mute">Menu</div>
        <nav className="mt-3 space-y-1">
          {MENU.map((item) => {
            const on = path === item.href || path.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-2 py-1.5 text-sm ${
                  on ? "bg-ink-800 text-text" : "text-mute hover:text-text"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-mute">Past chats</div>
        <button type="button" onClick={onNew} className="text-xs text-mute hover:text-text">
          New
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {chats.length === 0 && (
          <p className="px-2 text-xs text-mute">No chats yet. Send a hypothesis to start one.</p>
        )}
        {chats.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect?.(c)}
            className={`mb-1 w-full rounded-md px-2 py-2 text-left text-sm ${
              activeId === c.id ? "bg-ink-800 text-text" : "text-mute hover:bg-ink-800 hover:text-text"
            }`}
          >
            <div className="truncate">{c.title}</div>
            <div className="mt-0.5 font-mono text-[10px] text-mute">{c.createdAt.slice(0, 10)}</div>
          </button>
        ))}
      </div>
    </aside>
  );
}
