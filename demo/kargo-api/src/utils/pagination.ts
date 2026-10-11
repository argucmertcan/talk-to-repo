export function paginate(page = 1, size = 20) {
  const p = Math.max(1, page), s = Math.min(100, Math.max(1, size));
  return { limit: s, offset: (p - 1) * s };
}
