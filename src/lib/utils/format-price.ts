const PLACEHOLDER_PRICE = "—";

/**
 * Formats price for display: AUD $X.XX with 2 decimal places.
 */
export function formatPrice(priceStr: string | null | undefined): string {
  if (!priceStr || priceStr === PLACEHOLDER_PRICE || !priceStr.trim()) {
    return PLACEHOLDER_PRICE;
  }
  const num = parseFloat(priceStr.replace(/,/g, ""));
  if (Number.isNaN(num)) return PLACEHOLDER_PRICE;
  return `AUD $${num.toFixed(2)}`;
}

/**
 * Normalizes price to 2 decimal places for storage.
 */
export function normalizePriceForStorage(price: number): string {
  return price.toFixed(2);
}
