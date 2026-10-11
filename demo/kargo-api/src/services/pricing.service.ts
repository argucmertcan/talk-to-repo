import { withVat } from "../utils/money";

const ZONES: Record<string, number> = { "İstanbul": 49, "Ankara": 55, "İzmir": 55 };

export function quote(weightKg: number, city: string, express = false) {
  const base = ZONES[city] ?? 65;
  const net = base + Math.max(0, weightKg - 1) * 14 + (express ? 40 : 0);
  return { net, gross: withVat(net) };
}
