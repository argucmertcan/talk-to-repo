import { ShipmentModel } from "../db/models/shipment.model";
import { generateTrackingNo } from "../utils/trackingNo";
import { notifyStatusChange } from "../notifications/sms.service";

export async function createShipment(senderId: number, receiverCity: string, weightKg: number) {
  return ShipmentModel.insert({
    trackingNo: generateTrackingNo(receiverCity), status: "created", senderId, receiverCity, weightKg, createdAt: new Date(),
  });
}

export async function updateStatus(id: number, status: string) {
  const s = await ShipmentModel.update(id, { status });
  await notifyStatusChange(s.trackingNo, status);
  return s;
}
