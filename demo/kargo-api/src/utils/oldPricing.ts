// v1 fiyatlandırma. pricing.service.ts'e taşındı; artık kullanılmıyor olmalı.
export function oldPrice(weightKg: number, city: string) {
  const base = city === "İstanbul" ? 45 : 60;
  return base + Math.max(0, weightKg - 1) * 12.5;
}

export function oldExpressSurcharge(price: number) {
  return price * 0.35;
}
