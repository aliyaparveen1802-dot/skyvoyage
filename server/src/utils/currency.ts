/** All demo fares are displayed in Indian Rupees (₹). */
export const DISPLAY_CURRENCY = 'INR' as const;

/** Approximate USD→INR rate used to scale the demo price model into rupees. */
export const USD_TO_INR = 83;

/** Convert a USD-modelled amount into whole rupees. */
export function toInr(amount: number): number {
  return Math.round(amount * USD_TO_INR);
}
