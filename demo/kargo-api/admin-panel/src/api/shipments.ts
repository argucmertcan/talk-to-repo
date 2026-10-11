import { api } from "./client";
export const listShipments = () => api<{ trackingNo: string; status: string }[]>("/shipments");
