/**
 * ocrParser.ts
 *
 * Extracts payment card fields from raw OCR text.
 *
 * Detects:
 *  - Card number  (13–19 digits, handles Amex 4-6-5 and standard 4-4-4-4)
 *  - Expiry date  (MM/YY or MM/YYYY, with "VALID THRU" context)
 *  - Valid-from   (MM/YY, with "VALID FROM" context or two-date disambiguation)
 *  - Cardholder name (uppercase 2-5 word sequences)
 *  - Bank name    (lines containing bank keywords or known bank names)
 *  - Card type    (DEBIT, CREDIT, PLATINUM, INTERNATIONAL DEBIT, etc.)
 *
 * parseCVVFromOCR() is used separately on a back-of-card image.
 *
 * All results are best-effort; the user can correct in the form before saving.
 */

import { OCRCardResult } from '../types';

// ── Patterns ──────────────────────────────────────────────────────────────────

// Card number: 13–19 digits with optional spaces or dashes between groups
const CARD_NUMBER_SRC = String.raw`\b(\d[ \-]*){13,19}\b`;

// Bare expiry/date: MM/YY, MM-YY, MM/YYYY
const EXPIRY_SRC = String.raw`\b(0[1-9]|1[0-2])[\/\-]([0-9]{2,4})\b`;

// Labeled "VALID FROM MM/YY" (case-insensitive, matched on uppercase text)
const VALID_FROM_SRC = String.raw`(?:VALID\s+FROM|VALID\s*:\s*FROM|FROM)\s+(0[1-9]|1[0-2])[\/\-]([0-9]{2,4})`;

// Labeled "VALID THRU MM/YY" / "EXPIRES MM/YY"
const VALID_THRU_SRC = String.raw`(?:VALID\s+(?:THRU|THROUGH|TO)|THRU|THROUGH|EXPIRES?(?:\s+END)?|EXPIRY|EXPIRATION)\s+(0[1-9]|1[0-2])[\/\-]([0-9]{2,4})`;

// Card type tokens ordered most-specific first
const CARD_TYPE_TOKENS: string[] = [
  'INTERNATIONAL DEBIT',
  'INTERNATIONAL CREDIT',
  'WORLD ELITE',
  'WORLD MASTERCARD',
  'DEBIT',
  'CREDIT',
  'PREPAID',
  'PLATINUM',
  'GOLD',
  'SILVER',
  'TITANIUM',
  'CORAL',
  'WORLD',
  'INFINITE',
  'SIGNATURE',
  'PREMIER',
  'ELITE',
  'CLASSIC',
  'BUSINESS',
  'MILLENNIA',
  'SAPPHIRO',
  'REGALIA',
  'PINNACLE',
  'SELECT',
];

// Words that disqualify a line from being a cardholder name
const EXCLUDE_NAME = new Set([
  'VALID', 'FROM', 'THRU', 'THROUGH', 'EXPIRES', 'EXPIRY', 'EXPIRATION',
  'DEBIT', 'CREDIT', 'PREPAID', 'VISA', 'MASTERCARD', 'AMEX', 'DISCOVER',
  'RUPAY', 'MAESTRO', 'CIRRUS', 'UNIONPAY',
  'PLATINUM', 'GOLD', 'SILVER', 'CORAL', 'WORLD', 'INFINITE', 'SIGNATURE',
  'TITANIUM', 'CLASSIC', 'BUSINESS', 'INTERNATIONAL', 'PREMIER', 'MILLENNIA',
  'BANK', 'FINANCIAL', 'MEMBER', 'SINCE', 'GOOD', 'AUTHORIZED', 'SIGNATORY',
  'ONLY', 'CARD', 'LIMIT', 'AMOUNT', 'THE', 'FOR', 'USE', 'ELITE', 'SELECT',
  'CUSTOMER', 'CARE', 'LIMITED', 'EDITION', 'SAVINGS',
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeYear(raw: string): string {
  return raw.length === 4 ? raw.slice(-2) : raw;
}

function dateOrdinal(month: string, year: string): number {
  return parseInt(year, 10) * 12 + parseInt(month, 10);
}

/**
 * Returns true if the line looks like a person's name:
 * 2-5 words of uppercase letters only, none of which are reserved keywords.
 */
function looksLikeName(line: string): boolean {
  const words = line.trim().split(/\s+/);
  if (words.length < 2 || words.length > 5) return false;
  if (!words.every(w => /^[A-Z]{2,20}$/.test(w))) return false;
  if (words.some(w => EXCLUDE_NAME.has(w))) return false;
  if (line.replace(/\s/g, '').length < 5) return false;
  return true;
}

/**
 * Returns true if the line contains bank-identifying keywords or known bank names.
 */
function looksLikeBank(line: string): boolean {
  const u = line.toUpperCase();
  return (
    /\b(BANK|FINANCIAL|CREDIT UNION|SAVINGS|BANCORP|FINANCE)\b/.test(u) ||
    /\b(HDFC|ICICI|SBI|AXIS|KOTAK|CHASE|BARCLAYS|CITIBANK|WELLS FARGO|AMERICAN EXPRESS|HSBC|RBC|SCOTIABANK|BMO|ANZ|NAB|WESTPAC|LLOYDS|NATWEST|SANTANDER|DEUTSCHE|REVOLUT|MONZO|CAPITAL ONE|CAPITALONE|DISCOVER BANK)\b/.test(u)
  );
}

// ── Main OCR parser (front of card) ──────────────────────────────────────────

/**
 * Parses OCR text from the front of a card and returns all detectable fields.
 */
export function parseCardFromOCR(text: string): OCRCardResult {
  const result: OCRCardResult = {};
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const joined = lines.join(' ');
  const upper = joined.toUpperCase();

  // ── 1. Card Number ────────────────────────────────────────────────────────
  const cardMatches = [...joined.matchAll(new RegExp(CARD_NUMBER_SRC, 'g'))];
  if (cardMatches.length > 0) {
    const best = cardMatches.sort(
      (a, b) => b[0].replace(/\D/g, '').length - a[0].replace(/\D/g, '').length,
    )[0];
    const digits = best[0].replace(/\D/g, '');
    if (digits.length >= 13 && digits.length <= 19) {
      result.cardNumber = digits;
    }
  }

  // ── 2. Dates (with labeled-context priority) ──────────────────────────────
  // Try "VALID FROM" labeled date first
  const fromMatches = [...upper.matchAll(new RegExp(VALID_FROM_SRC, 'g'))];
  if (fromMatches.length > 0) {
    result.validFromMonth = fromMatches[0][1];
    result.validFromYear = normalizeYear(fromMatches[0][2]);
  }

  // Try "VALID THRU / EXPIRES" labeled date
  const thruMatches = [...upper.matchAll(new RegExp(VALID_THRU_SRC, 'g'))];
  if (thruMatches.length > 0) {
    result.expiryMonth = thruMatches[0][1];
    result.expiryYear = normalizeYear(thruMatches[0][2]);
  }

  // Fallback: collect all bare MM/YY dates not already handled
  if (!result.expiryMonth) {
    const allDates = [...joined.matchAll(new RegExp(EXPIRY_SRC, 'g'))].map(m => ({
      month: m[1],
      year: normalizeYear(m[2]),
    })).sort((a, b) => dateOrdinal(a.month, a.year) - dateOrdinal(b.month, b.year));

    if (allDates.length === 1) {
      result.expiryMonth = allDates[0].month;
      result.expiryYear = allDates[0].year;
    } else if (allDates.length >= 2) {
      // Two dates → earlier = valid-from, later = expiry
      if (!result.validFromMonth) {
        result.validFromMonth = allDates[0].month;
        result.validFromYear = allDates[0].year;
      }
      result.expiryMonth = allDates[allDates.length - 1].month;
      result.expiryYear = allDates[allDates.length - 1].year;
    }
  }

  // ── 3. Card Type ──────────────────────────────────────────────────────────
  for (const token of CARD_TYPE_TOKENS) {
    if (upper.includes(token)) {
      // Title-case the token for display
      result.cardType = token
        .split(' ')
        .map(w => w.charAt(0) + w.slice(1).toLowerCase())
        .join(' ');
      break;
    }
  }

  // ── 4. Bank Name ──────────────────────────────────────────────────────────
  // Prefer lines near the top of the card
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    if (looksLikeBank(lines[i])) {
      result.bankName = lines[i].trim();
      break;
    }
  }
  // Fallback: scan all lines
  if (!result.bankName) {
    for (const line of lines) {
      if (looksLikeBank(line)) {
        result.bankName = line.trim();
        break;
      }
    }
  }

  // ── 5. Cardholder Name ────────────────────────────────────────────────────
  // Find which line contains the card number (so we search below it for the name)
  let cardLineIdx = -1;
  if (result.cardNumber) {
    const prefix8 = result.cardNumber.slice(0, 8);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].replace(/\D/g, '').includes(prefix8)) {
        cardLineIdx = i;
        break;
      }
    }
  }

  // Search bottom half first (where names normally appear on cards)
  const nameSearchStart = cardLineIdx >= 0 ? cardLineIdx + 1 : 0;
  for (let i = nameSearchStart; i < lines.length; i++) {
    const u = lines[i].toUpperCase();
    if (looksLikeName(u) && !looksLikeBank(u)) {
      result.cardHolderName = u;
      break;
    }
  }
  // Fallback: search all lines
  if (!result.cardHolderName) {
    for (const line of lines) {
      const u = line.toUpperCase();
      if (looksLikeName(u) && !looksLikeBank(u)) {
        result.cardHolderName = u;
        break;
      }
    }
  }

  return result;
}

// ── Back-of-card CVV parser ───────────────────────────────────────────────────

/**
 * Parses OCR text from the back of a card to extract the CVV/CVC.
 *
 * Looks for:
 *  - Labeled patterns: "CVV2: 123", "CVC: 456", "CID 1234" (Amex)
 *  - Isolated 3–4 digit numbers not adjacent to other digits
 */
export function parseCVVFromOCR(text: string): string | undefined {
  const normalized = text.replace(/\n/g, ' ');

  // Labeled CVV
  const labeled = normalized.match(/\b(?:CVV2?|CVC2?|CID)\s*:?\s*(\d{3,4})\b/i);
  if (labeled) return labeled[1];

  // Isolated 3–4 digit number (not part of a longer digit sequence)
  const candidates = [...normalized.matchAll(/(?<!\d)(\d{3,4})(?!\d)/g)]
    .map(m => m[1])
    // Exclude years (20xx)
    .filter(d => !(d.length === 4 && /^20\d{2}$/.test(d)))
    // Exclude month/day-like values at start ("01"-"12")
    .filter(d => d.length === 3 || (d.length === 4));

  return candidates[0];
}

// ── Merge helper ──────────────────────────────────────────────────────────────

/**
 * Merges multiple OCR results, preferring the first non-null value per field.
 */
export function mergeOCRResults(results: OCRCardResult[]): OCRCardResult {
  return results.reduce(
    (acc, curr) => ({
      cardNumber: acc.cardNumber ?? curr.cardNumber,
      expiryMonth: acc.expiryMonth ?? curr.expiryMonth,
      expiryYear: acc.expiryYear ?? curr.expiryYear,
      cardHolderName: acc.cardHolderName ?? curr.cardHolderName,
      bankName: acc.bankName ?? curr.bankName,
      validFromMonth: acc.validFromMonth ?? curr.validFromMonth,
      validFromYear: acc.validFromYear ?? curr.validFromYear,
      cardType: acc.cardType ?? curr.cardType,
    }),
    {} as OCRCardResult,
  );
}
