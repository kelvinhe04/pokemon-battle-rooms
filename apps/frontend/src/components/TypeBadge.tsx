import { typeColor } from "../lib/types";

export function TypeBadge({ type }: { type: string }) {
  return (
    <span className="type-badge" style={{ background: typeColor(type) }}>
      {type}
    </span>
  );
}
