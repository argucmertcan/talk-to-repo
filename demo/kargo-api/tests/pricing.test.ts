import { quote } from "../src/services/pricing.service";

test("İstanbul 1 kg", () => {
  expect(quote(1, "İstanbul").net).toBe(49);
});
