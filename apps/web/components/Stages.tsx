export function Stages({ stages }: { stages?: { key: string; label: string; status: string }[] }) {
  if (!stages?.length) return null;
  return (
    <ol className="space-y-1 font-mono text-sm">
      {stages.map((s) => {
        const mark = s.status === "done" ? "✓" : s.status === "active" ? "●" : s.status === "blocked" ? "×" : "○";
        return (
          <li key={s.key} className="flex gap-3">
            <span className="w-4 text-mute">{mark}</span>
            <span className={s.status === "pending" ? "text-mute" : "text-text"}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
