import { motion } from "framer-motion";

export function HpBar({ current, max }: { current: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const cls = pct > 50 ? "high" : pct > 20 ? "mid" : "low";
  return (
    <div>
      <div className="hp-bar">
        <motion.div
          className={`hp-bar-fill ${cls}`}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <div style={{ fontSize: "0.75rem", marginTop: 2, color: "#666", textAlign: "right" }}>
        {current} / {max}
      </div>
    </div>
  );
}
