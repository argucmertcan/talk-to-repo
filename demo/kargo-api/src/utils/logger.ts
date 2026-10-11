export const logger = {
  info: (m: string) => console.log(`[info] ${new Date().toISOString()} ${m}`),
  warn: (m: string) => console.warn(`[warn] ${m}`),
  error: (m: string) => console.error(`[error] ${m}`),
};
