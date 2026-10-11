import { generateTrackingNo } from "../src/utils/trackingNo";

test("şehir kodu", () => {
  expect(generateTrackingNo("Ankara").startsWith("KRANK")).toBe(true);
});
