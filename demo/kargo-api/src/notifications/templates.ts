const T: Record<string, (v: Record<string, unknown>) => string> = {
  reset: (v) => `<p>Şifreni sıfırlamak için <a href="${v.link}">buraya tıkla</a>. Bağlantı 30 dakika geçerli.</p>`,
  invoice: (v) => `<p>#${v.invoiceId} numaralı faturanız hazır.</p>`,
};
export const renderTemplate = (name: string, vars: Record<string, unknown>) => T[name](vars);
