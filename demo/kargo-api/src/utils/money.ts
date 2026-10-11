export const toKurus = (tl: number) => Math.round(tl * 100);
export const fromKurus = (k: number) => k / 100;
export const formatTL = (tl: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(tl);
export const withVat = (net: number, rate = 0.2) => Math.round(net * (1 + rate) * 100) / 100;
