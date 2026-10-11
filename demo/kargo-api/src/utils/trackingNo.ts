export function generateTrackingNo(city: string) {
  const code = city.slice(0, 3).toUpperCase();
  return `KR${code}${Date.now().toString(36).toUpperCase()}`;
}
