import { api } from "./client";
export const monthlyReport = () => api<{ customer: string; total: number }[]>("/reports/monthly");
