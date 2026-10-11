export const addMinutes = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);
export const isExpired = (d: Date) => d.getTime() < Date.now();
export const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
