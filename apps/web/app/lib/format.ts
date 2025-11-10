// apps/web/app/lib/format.ts

/**
 * Formats a number as currency (e.g., €4,554,751.69)
 * Adjust 'de-DE' (German) and 'EUR' (Euro) as needed to match Figma.
 */
export function formatCurrency(value: number | string | undefined | null) {
  const num = Number(value || 0);
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(num);
}

/**
 * Formats a number as a plain number with no decimals (e.g., 50)
 */
export function formatNumber(value: number | string | undefined | null) {
  const num = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0, // No decimals for counts
  }).format(num);
}