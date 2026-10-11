import { LEGACY_CARRIER } from "../config/legacy";

export async function handOverToLegacyCarrier(trackingNo: string) {
  const res = await fetch(`${LEGACY_CARRIER.baseUrl}/handover`, {
    method: "POST",
    headers: { "x-api-key": LEGACY_CARRIER.apiKey, "content-type": "application/json" },
    body: JSON.stringify({ trackingNo }),
  });
  return res.ok;
}
