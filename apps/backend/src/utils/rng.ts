export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
export function coinFlip(): 0 | 1 {
  return Math.random() < 0.5 ? 0 : 1;
}
export function chance(p: number): boolean {
  return Math.random() < p;
}
