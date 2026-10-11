import { ShipmentModel } from "../db/models/shipment.model";

export async function track(trackingNo: string) {
  const [s] = await ShipmentModel.findMany({ trackingNo });
  return s ? { trackingNo, status: s.status, city: s.receiverCity } : null;
}
