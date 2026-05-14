import { useEffect, useRef } from "react";

export function BattleLog({ entries }: { entries: any[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [entries.length]);
  return (
    <div className="battle-log" ref={ref}>
      {entries.map((e, i) => (
        <div key={i} className={`log-line ${e.kind}`}>
          <span style={{ color: "var(--muted)" }}>[T{e.turn}]</span> {e.text}
        </div>
      ))}
    </div>
  );
}
