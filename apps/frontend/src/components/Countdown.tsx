import { useEffect, useState } from "react";

export function Countdown({ seconds, onEnd }: { seconds: number; onEnd?: () => void }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    const t = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          onEnd?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, []);
  const cls = left <= 10 ? "low" : left <= 30 ? "mid" : "high";
  return (
    <span style={{ fontWeight: 700, color: cls === "low" ? "var(--red)" : cls === "mid" ? "var(--yellow)" : "var(--green)" }}>
      {left}s
    </span>
  );
}
