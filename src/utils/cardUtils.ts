import { CardBrand } from '../types';

// ─── Brand Detection ──────────────────────────────────────────────────────────

/**
 * Detects the card network from the card number prefix.
 * Uses standard IIN/BIN ranges.
 */
export function detectCardBrand(cardNumber: string): CardBrand {
  const n = cardNumber.replace(/\D/g, '');

  if (/^4/.test(n)) return 'visa';
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  if (/^6(?:011|5[0-9]{2})/.test(n)) return 'discover';
  return 'unknown';
}

// ─── Formatting ───────────────────────────────────────────────────────────────

/**
 * Returns masked number. Amex shows "•••• •••••• #####", others "•••• •••• •••• ####".
 */
export function maskCardNumber(cardNumber: string): string {
  const n = cardNumber.replace(/\D/g, '');
  if (/^3[47]/.test(n)) {
    // Amex: 4-6-5
    return `•••• •••••• ${n.slice(10)}`;
  }
  return `•••• •••• •••• ${n.slice(-4)}`;
}

/**
 * Formats a raw digit string using network-appropriate grouping.
 * Amex: "3782 822463 10005"  (4-6-5)
 * Others: "4242 4242 4242 4242"  (4-4-4-4)
 */
export function formatCardNumber(cardNumber: string): string {
  const n = cardNumber.replace(/\D/g, '');
  if (/^3[47]/.test(n)) {
    // Amex 4-6-5
    if (n.length <= 4) return n;
    if (n.length <= 10) return `${n.slice(0, 4)} ${n.slice(4)}`;
    return `${n.slice(0, 4)} ${n.slice(4, 10)} ${n.slice(10)}`;
  }
  const groups = n.match(/.{1,4}/g) ?? [];
  return groups.join(' ');
}

/**
 * Returns "MM/YY" formatted expiry string.
 */
export function formatExpiry(month: string, year: string): string {
  const m = month.padStart(2, '0');
  const y = year.slice(-2);
  return `${m}/${y}`;
}

// ─── Brand Colors / Gradients ─────────────────────────────────────────────────

export function getBrandGradient(brand: CardBrand): [string, string] {
  switch (brand) {
    case 'visa':       return ['#1A1F71', '#2850A8'];
    case 'mastercard': return ['#1C1C1C', '#3D3D3D'];
    case 'amex':       return ['#007B5E', '#00A878'];
    case 'discover':   return ['#FF6B00', '#C84B00'];
    default:           return ['#1C1C1E', '#2C2C2E'];
  }
}

export function getBrandAccent(brand: CardBrand): string {
  switch (brand) {
    case 'visa':       return '#FFFFFF';
    case 'mastercard': return '#F79E1B';
    case 'amex':       return '#A3F0D6';
    case 'discover':   return '#FFB347';
    default:           return '#8E8E93';
  }
}

export function getBrandLabel(brand: CardBrand): string {
  switch (brand) {
    case 'visa':       return 'VISA';
    case 'mastercard': return 'MASTERCARD';
    case 'amex':       return 'AMEX';
    case 'discover':   return 'DISCOVER';
    default:           return '';
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

/** Luhn algorithm check. */
export function isValidCardNumber(cardNumber: string): boolean {
  const n = cardNumber.replace(/\D/g, '');
  if (n.length < 13 || n.length > 19) return false;

  let sum = 0;
  let alternate = false;

  for (let i = n.length - 1; i >= 0; i--) {
    let digit = parseInt(n[i], 10);
    if (alternate) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

export function isValidExpiry(month: string, year: string): boolean {
  const m = parseInt(month, 10);
  const y = parseInt(year.length === 2 ? `20${year}` : year, 10);
  if (m < 1 || m > 12) return false;

  const now = new Date();
  const expiry = new Date(y, m - 1, 1);
  return expiry >= new Date(now.getFullYear(), now.getMonth(), 1);
}
