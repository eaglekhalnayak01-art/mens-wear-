export function averageRating(items: { rating: number }[]) {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + item.rating, 0) / items.length;
}
