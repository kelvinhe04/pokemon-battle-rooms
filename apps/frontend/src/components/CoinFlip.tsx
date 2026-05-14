import { motion } from "framer-motion";

export function CoinFlip({ winnerName }: { winnerName: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", padding: "3rem" }}>
      <motion.div
        className="coin"
        animate={{ rotateY: [0, 360, 720, 1080], scale: [1, 1.1, 1] }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      >
        ⚡
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
        style={{ textAlign: "center" }}
      >
        <h2 className="title" style={{ fontSize: "2rem" }}>¡{winnerName} mueve primero!</h2>
        <p className="muted">Comenzando batalla...</p>
      </motion.div>
    </div>
  );
}
