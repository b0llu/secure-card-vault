/**
 * ocrParser.ts
 *
 * Payment-card OCR parsing built around ML Kit line/element output.
 *
 * Goals:
 *  - Prefer card numbers that pass Luhn/brand checks
 *  - Distinguish expiry vs valid-from using nearby label context
 *  - Prefer real cardholder names over legal/disclaimer text
 *  - Prefer signature-strip CVV digits over embossed PAN groups on the back
 */

import type {
  Frame,
  TextElement,
  TextLine,
  TextRecognitionResult,
} from '@react-native-ml-kit/text-recognition';

import type { CardBrand, OCRCardResult } from '../types';
import { detectCardBrand, isValidCardNumber } from './cardUtils';

type OCRInput = string | TextRecognitionResult;

interface NormalizedElement {
  text: string;
  upper: string;
  frame?: Frame;
}

interface NormalizedLine {
  index: number;
  text: string;
  upper: string;
  frame?: Frame;
  elements: NormalizedElement[];
}

interface CardNumberCandidate {
  digits: string;
  score: number;
  lineIndex: number;
}

interface DateMatch {
  month: string;
  year: string;
  lineIndex: number;
  kind?: 'expiry' | 'validFrom';
  score: number;
}

const CARD_NUMBER_SRC = String.raw`\b(\d[ \-]*){13,19}\b`;
const DATE_SRC = String.raw`\b(0[1-9]|1[0-2])[\/\-]([0-9]{2,4})\b`;
const VALID_FROM_SRC = String.raw`(?:VALID\s+FROM|FROM)\s+(0[1-9]|1[0-2])[\/\-]([0-9]{2,4})`;
const VALID_THRU_SRC = String.raw`(?:VALID\s+(?:THRU|THROUGH|TO)|GOOD\s+THRU|THRU|THROUGH|EXPIRES?(?:\s+END)?|EXPIRY|EXPIRATION)\s+(0[1-9]|1[0-2])[\/\-]([0-9]{2,4})`;

const CARD_TYPE_TOKENS: Array<{ match: string; value: string }> = [
  { match: 'INTERNATIONAL DEBIT CARD', value: 'International Debit Card' },
  { match: 'INTERNATIONAL CREDIT CARD', value: 'International Credit Card' },
  { match: 'WORLD ELITE', value: 'World Elite' },
  { match: 'WORLD MASTERCARD', value: 'World Mastercard' },
  { match: 'INTERNATIONAL DEBIT', value: 'International Debit' },
  { match: 'INTERNATIONAL CREDIT', value: 'International Credit' },
  { match: 'AMAZON PAY', value: 'Amazon Pay' },
  { match: 'DEBIT CARD', value: 'Debit Card' },
  { match: 'CREDIT CARD', value: 'Credit Card' },
  { match: 'PREPAID CARD', value: 'Prepaid Card' },
  { match: 'RUBYX', value: 'Rubyx' },
  { match: 'MILLENNIA', value: 'Millennia' },
  { match: 'REGALIA', value: 'Regalia' },
  { match: 'PINNACLE', value: 'Pinnacle' },
  { match: 'CORAL', value: 'Coral' },
  { match: 'PLATINUM', value: 'Platinum' },
  { match: 'TITANIUM', value: 'Titanium' },
  { match: 'GOLD', value: 'Gold' },
  { match: 'SILVER', value: 'Silver' },
  { match: 'SIGNATURE', value: 'Signature' },
  { match: 'INFINITE', value: 'Infinite' },
  { match: 'PREPAID', value: 'Prepaid' },
  { match: 'DEBIT', value: 'Debit' },
  { match: 'CREDIT', value: 'Credit' },
];

const EXCLUDE_NAME = new Set([
  'VALID',
  'FROM',
  'THRU',
  'THROUGH',
  'GOOD',
  'EXPIRES',
  'EXPIRY',
  'EXPIRATION',
  'DEBIT',
  'CREDIT',
  'PREPAID',
  'CARD',
  'BANK',
  'AUTHORISED',
  'AUTHORIZED',
  'SIGNATURE',
  'SIGNED',
  'UNLESS',
  'VALID',
  'MEMBER',
  'SINCE',
  'ONLY',
  'NOT',
  'TRANSFERABLE',
  'USE',
  'SUBJECT',
  'AGREEMENT',
  'FOREIGN',
  'EXCHANGE',
  'CUSTOMER',
  'CARE',
  'HELPLINE',
  'TOLL',
  'FREE',
  'ICICI',
  'PARASWAT',
  'BOI',
  'INDIA',
  'AMERICAN',
  'EXPRESS',
  'VISA',
  'MASTERCARD',
  'DISCOVER',
  'RUPAY',
  'RUBYX',
  'CORAL',
  'PLATINUM',
  'TITANIUM',
  'AMAZON',
  'PAY',
  'WORLD',
  'ELITE',
  'INTERNATIONAL',
]);

const NOISE_LINE_PATTERN =
  /\b(?:WWW|HTTP|HELPLINE|TOLL\s*FREE|CUSTOMER\s+CARE|FOREIGN\s+EXCHANGE|QR\s+CODE|SCAN\s+THIS|AUTHORI[ZS]ED|SIGNATURE|NOT\s+TRANSFERABLE|SUBJECT\s+TO|CARDMEMBER|AGREEMENT|MISUSE|CRIMINAL|OFFENCE|NOTIFY|PROPERTY|PIN\/SIGN|WAVE\/INSERT|SHOP)\b/;

const BANK_PATTERNS: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /\bICICI\b/, value: 'ICICI Bank' },
  { pattern: /\bHDFC\b/, value: 'HDFC Bank' },
  { pattern: /\bBANK OF INDIA\b|\bBOI\b/, value: 'Bank of India' },
  { pattern: /\bPARASWAT\b/, value: 'Paraswat Bank' },
  { pattern: /\bSTATE BANK OF INDIA\b|\bSBI\b/, value: 'SBI' },
  { pattern: /\bAXIS\b/, value: 'Axis Bank' },
  { pattern: /\bKOTAK\b/, value: 'Kotak Bank' },
  { pattern: /\bCHASE\b/, value: 'Chase' },
  { pattern: /\bBARCLAYS\b/, value: 'Barclays' },
  { pattern: /\bCITIBANK\b|\bCITI\b/, value: 'Citibank' },
  { pattern: /\bHSBC\b/, value: 'HSBC' },
  { pattern: /\bAMERICAN EXPRESS\b/, value: 'American Express' },
];

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function normalizeDigitLike(text: string): string {
  return text
    .toUpperCase()
    .replace(/[OQD]/g, '0')
    .replace(/[IL|]/g, '1')
    .replace(/S/g, '5')
    .replace(/B/g, '8')
    .replace(/Z/g, '2');
}

function normalizeYear(raw: string): string {
  return raw.length === 4 ? raw.slice(-2) : raw;
}

function dateOrdinal(month: string, year: string): number {
  return parseInt(year, 10) * 12 + parseInt(month, 10);
}

function frameBottom(frame?: Frame): number {
  return frame ? frame.top + frame.height : 0;
}

function frameCenterY(frame?: Frame): number {
  return frame ? frame.top + frame.height / 2 : 0;
}

function getImageHeight(lines: NormalizedLine[]): number {
  const lineHeight = Math.max(...lines.map((line) => frameBottom(line.frame)), 0);
  const elementHeight = Math.max(
    ...lines.flatMap((line) => line.elements.map((element) => frameBottom(element.frame))),
    0,
  );
  return Math.max(lineHeight, elementHeight, lines.length || 1);
}

function looksLikeNoiseLine(line: string): boolean {
  return NOISE_LINE_PATTERN.test(line.toUpperCase());
}

function looksLikeBank(line: string): boolean {
  const upper = line.toUpperCase();
  if (upper.includes('WWW.') || upper.includes('.COM') || upper.includes('HTTP')) return false;
  return (
    /\b(BANK|FINANCIAL|CREDIT UNION|SAVINGS|BANCORP|FINANCE)\b/.test(upper) ||
    BANK_PATTERNS.some(({ pattern }) => pattern.test(upper))
  );
}

function normalizeBankName(line: string): string {
  const upper = line.toUpperCase();
  const match = BANK_PATTERNS.find(({ pattern }) => pattern.test(upper));
  if (match) return match.value;
  return normalizeWhitespace(line);
}

function normalizeNameCandidate(line: string): string {
  return normalizeWhitespace(
    line
      .toUpperCase()
      .replace(/[^A-Z\s]/g, ' ')
      .replace(/\b(MR|MRS|MS|DR)([A-Z])/g, '$1 $2'),
  );
}

function looksLikeName(line: string): boolean {
  const normalized = normalizeNameCandidate(line);
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 6) return false;
  if (normalized.replace(/\s/g, '').length < 5) return false;
  if (!words.every((word) => /^[A-Z]{1,20}$/.test(word))) return false;
  if (words.filter((word) => word.length === 1).length > 1) return false;
  if (words.some((word) => EXCLUDE_NAME.has(word))) return false;
  return true;
}

function sortLines(lines: NormalizedLine[]): NormalizedLine[] {
  return [...lines].sort((a, b) => {
    if (a.frame && b.frame) {
      const topDelta = a.frame.top - b.frame.top;
      if (Math.abs(topDelta) > 6) return topDelta;
      return a.frame.left - b.frame.left;
    }
    if (a.frame) return -1;
    if (b.frame) return 1;
    return a.index - b.index;
  });
}

function normalizeLine(line: TextLine, index: number): NormalizedLine {
  const text = normalizeWhitespace(line.text);
  const elements = (line.elements ?? [])
    .map((element: TextElement) => ({
      text: normalizeWhitespace(element.text),
      upper: normalizeWhitespace(element.text).toUpperCase(),
      frame: element.frame,
    }))
    .filter((element) => element.text.length > 0)
    .sort((a, b) => {
      if (a.frame && b.frame) return a.frame.left - b.frame.left;
      if (a.frame) return -1;
      if (b.frame) return 1;
      return 0;
    });

  return {
    index,
    text,
    upper: text.toUpperCase(),
    frame: line.frame,
    elements,
  };
}

function getNormalizedLines(input: OCRInput): NormalizedLine[] {
  if (typeof input === 'string') {
    return input
      .split('\n')
      .map((line, index) => ({
        index,
        text: normalizeWhitespace(line),
        upper: normalizeWhitespace(line).toUpperCase(),
        frame: undefined,
        elements: [],
      }))
      .filter((line) => line.text.length > 0);
  }

  const flattened = input.blocks.flatMap((block) => block.lines).map(normalizeLine);
  return sortLines(flattened.filter((line) => line.text.length > 0));
}

function buildJoinedText(lines: NormalizedLine[]): string {
  return lines.map((line) => line.text).join('\n');
}

function countDigitGroups(text: string, size: number): number {
  return [...normalizeDigitLike(text).matchAll(new RegExp(`\\b\\d{${size}}\\b`, 'g'))].length;
}

function isLikelyPanLine(text: string): boolean {
  const normalized = normalizeDigitLike(text);
  const digitCount = normalized.replace(/\D/g, '').length;
  return digitCount >= 13 || countDigitGroups(normalized, 4) >= 2;
}

function isLikelyDateLine(text: string): boolean {
  return /\b(?:VALID|THRU|THROUGH|FROM|GOOD|EXPIRY|EXPIRATION|EXPIRES?)\b/.test(text.toUpperCase());
}

function buildCardNumberCandidates(lines: NormalizedLine[]): CardNumberCandidate[] {
  const candidates: CardNumberCandidate[] = [];
  const totalLines = Math.max(lines.length, 1);

  const addFromSource = (source: string, lineIndex: number, extraScore = 0) => {
    const normalized = normalizeDigitLike(source);
    for (const match of normalized.matchAll(new RegExp(CARD_NUMBER_SRC, 'g'))) {
      const digits = match[0].replace(/\D/g, '');
      if (digits.length < 13 || digits.length > 19) continue;

      let score = extraScore + 20;
      if (isValidCardNumber(digits)) score += 120;
      else score -= 40;

      const brand = detectCardBrand(digits);
      if (brand !== 'unknown') score += 20;

      const line = lineIndex >= 0 ? lines[lineIndex] : undefined;
      if (line && !looksLikeNoiseLine(line.text)) score += 10;
      if (lineIndex >= 0) {
        const ratio = lineIndex / totalLines;
        if (ratio > 0.15 && ratio < 0.8) score += 8;
      }

      candidates.push({ digits, score, lineIndex });
    }
  };

  lines.forEach((line, index) => addFromSource(line.text, index));

  for (let i = 0; i < lines.length - 1; i++) {
    addFromSource(`${lines[i].text} ${lines[i + 1].text}`, i, 8);
  }

  addFromSource(buildJoinedText(lines), -1, 4);

  const deduped = new Map<string, CardNumberCandidate>();
  for (const candidate of candidates) {
    const current = deduped.get(candidate.digits);
    if (!current || candidate.score > current.score) {
      deduped.set(candidate.digits, candidate);
    }
  }

  return [...deduped.values()].sort((a, b) => b.score - a.score);
}

function extractCardNumber(lines: NormalizedLine[]): CardNumberCandidate | undefined {
  return buildCardNumberCandidates(lines)[0];
}

function buildDateMatches(lines: NormalizedLine[]): DateMatch[] {
  const matches: DateMatch[] = [];

  const addMatchesFromText = (
    text: string,
    lineIndex: number,
    kind: 'expiry' | 'validFrom' | undefined,
    baseScore: number,
  ) => {
    const normalized = normalizeDigitLike(text);
    for (const match of normalized.matchAll(new RegExp(DATE_SRC, 'g'))) {
      matches.push({
        month: match[1],
        year: normalizeYear(match[2]),
        lineIndex,
        kind,
        score: baseScore,
      });
    }
  };

  lines.forEach((line, index) => {
    const window = [lines[index - 1]?.text, line.text, lines[index + 1]?.text]
      .filter(Boolean)
      .join(' ');
    const normalizedWindow = normalizeDigitLike(window);

    const fromMatches = [...normalizedWindow.matchAll(new RegExp(VALID_FROM_SRC, 'g'))];
    fromMatches.forEach((match) =>
      matches.push({
        month: match[1],
        year: normalizeYear(match[2]),
        lineIndex: index,
        kind: 'validFrom',
        score: 80,
      }),
    );

    const thruMatches = [...normalizedWindow.matchAll(new RegExp(VALID_THRU_SRC, 'g'))];
    thruMatches.forEach((match) =>
      matches.push({
        month: match[1],
        year: normalizeYear(match[2]),
        lineIndex: index,
        kind: 'expiry',
        score: 90,
      }),
    );

    addMatchesFromText(line.text, index, undefined, 25);
  });

  return matches;
}

function applyDates(result: OCRCardResult, lines: NormalizedLine[]) {
  const matches = buildDateMatches(lines);

  const bestExpiry = matches
    .filter((match) => match.kind === 'expiry')
    .sort((a, b) => b.score - a.score)[0];
  if (bestExpiry) {
    result.expiryMonth = bestExpiry.month;
    result.expiryYear = bestExpiry.year;
  }

  const bestValidFrom = matches
    .filter((match) => match.kind === 'validFrom')
    .sort((a, b) => b.score - a.score)[0];
  if (bestValidFrom) {
    result.validFromMonth = bestValidFrom.month;
    result.validFromYear = bestValidFrom.year;
  }

  const bareDates = matches
    .filter((match) => match.kind === undefined)
    .sort((a, b) => dateOrdinal(a.month, a.year) - dateOrdinal(b.month, b.year));

  if (!result.expiryMonth && bareDates.length === 1) {
    result.expiryMonth = bareDates[0].month;
    result.expiryYear = bareDates[0].year;
  } else if (bareDates.length >= 2) {
    if (!result.validFromMonth) {
      result.validFromMonth = bareDates[0].month;
      result.validFromYear = bareDates[0].year;
    }
    if (!result.expiryMonth) {
      const expiry = bareDates[bareDates.length - 1];
      result.expiryMonth = expiry.month;
      result.expiryYear = expiry.year;
    }
  }
}

function extractBankName(lines: NormalizedLine[]): string | undefined {
  const imageHeight = getImageHeight(lines);

  const candidates = lines
    .filter((line) => looksLikeBank(line.text))
    .map((line) => {
      let score = 40;
      if (!looksLikeNoiseLine(line.text)) score += 20;
      if (line.frame && imageHeight > 0) {
        const ratio = frameCenterY(line.frame) / imageHeight;
        if (ratio < 0.4) score += 20;
      }
      return { text: normalizeBankName(line.text), score };
    })
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.text;
}

function extractCardType(lines: NormalizedLine[]): string | undefined {
  const joined = buildJoinedText(lines).toUpperCase();
  for (const token of CARD_TYPE_TOKENS) {
    if (joined.includes(token.match)) return token.value;
  }
  return undefined;
}

function extractCardholderName(
  lines: NormalizedLine[],
  cardNumberCandidate?: CardNumberCandidate,
): string | undefined {
  const imageHeight = getImageHeight(lines);
  const cardLineIndex = cardNumberCandidate?.lineIndex ?? -1;

  const candidates = lines
    .map((line, index) => {
      if (!looksLikeName(line.text)) return null;

      let score = 30;
      if (index > cardLineIndex) score += 20;
      if (!looksLikeBank(line.text)) score += 12;
      if (!looksLikeNoiseLine(line.text)) score += 10;
      if (line.frame && imageHeight > 0) {
        const ratio = frameCenterY(line.frame) / imageHeight;
        if (ratio > 0.45) score += 18;
      }

      return { name: normalizeNameCandidate(line.text), score };
    })
    .filter((candidate): candidate is { name: string; score: number } => candidate !== null)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.name;
}

function scoreCVVDigitsLength(digits: string, preferredLength: 3 | 4): number {
  if (digits.length === preferredLength) return 30;
  if (preferredLength === 4 && digits.length === 3) return -20;
  if (preferredLength === 3 && digits.length === 4) return -35;
  return -10;
}

function extractCVVFromStructuredLines(
  lines: NormalizedLine[],
  brand: CardBrand | undefined,
): string | undefined {
  const preferredLength: 3 | 4 = brand === 'amex' ? 4 : 3;
  const imageHeight = getImageHeight(lines);
  const scored = new Map<string, number>();

  const addCandidate = (digits: string, score: number) => {
    const current = scored.get(digits);
    if (current === undefined || score > current) {
      scored.set(digits, score);
    }
  };

  for (const line of lines) {
    const normalizedLine = normalizeDigitLike(line.text);
    const totalDigits = normalizedLine.replace(/\D/g, '').length;
    const lineTopRatio =
      line.frame && imageHeight > 0 ? frameCenterY(line.frame) / imageHeight : 0.5;

    const linePositionScore =
      lineTopRatio <= 0.45 ? 28 : lineTopRatio >= 0.65 ? -24 : 6;
    const contextScore =
      /\b(?:CVV2?|CVC2?|CID)\b/.test(line.upper) ? 80 : 0;
    const signatureScore =
      /\b(?:SIGNATURE|CARD MEMBER)\b/.test(line.upper) ? 8 : 0;
    const noiseLinePenalty = looksLikeNoiseLine(line.text) ? -70 : 0;
    const dateLinePenalty = isLikelyDateLine(line.text) ? -50 : 0;
    const panLinePenalty = isLikelyPanLine(line.text) ? -90 : 0;
    const noisyDigitLinePenalty = totalDigits >= 13 ? -90 : 0;
    const stripLikeBonus =
      lineTopRatio <= 0.5 && totalDigits > 0 && totalDigits <= 8 && !looksLikeNoiseLine(line.text)
        ? 24
        : 0;

    for (const match of normalizedLine.matchAll(/\b\d{4}\s+(\d{3,4})\b/g)) {
      addCandidate(
        match[1],
        105 +
          linePositionScore +
          signatureScore +
          noiseLinePenalty +
          dateLinePenalty +
          panLinePenalty +
          stripLikeBonus +
          scoreCVVDigitsLength(match[1], preferredLength),
      );
    }

    const elementSources = line.elements.length > 0
      ? line.elements.map((element) => ({
          text: element.text,
          frame: element.frame,
        }))
      : normalizedLine.split(/\s+/).map((text) => ({ text, frame: line.frame }));

    for (const source of elementSources) {
      const digits = normalizeDigitLike(source.text).replace(/\D/g, '');
      if (digits.length < 3 || digits.length > 4) continue;
      if (digits.length === 4 && /^20\d{2}$/.test(digits)) continue;

      let score =
        20 +
        linePositionScore +
        contextScore +
        signatureScore +
        noiseLinePenalty +
        dateLinePenalty +
        panLinePenalty +
        noisyDigitLinePenalty +
        stripLikeBonus +
        scoreCVVDigitsLength(digits, preferredLength);

      if (source.frame && imageHeight > 0) {
        const ratio = frameCenterY(source.frame) / imageHeight;
        if (ratio <= 0.45) score += 12;
        if (ratio >= 0.65) score -= 10;
      }

      if (countDigitGroups(line.text, 4) >= 2 && digits.length === 4 && contextScore === 0) {
        score -= 80;
      }

      addCandidate(digits, score);
    }
  }

  const ranked = [...scored.entries()]
    .map(([digits, score]) => ({ digits, score }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best) return undefined;
  if (brand === 'amex') return best.score >= 100 ? best.digits : undefined;
  return best.score >= 55 ? best.digits : undefined;
}

export function parseCardFromOCR(input: OCRInput): OCRCardResult {
  const lines = getNormalizedLines(input);
  const result: OCRCardResult = {};

  if (lines.length === 0) return result;

  const cardNumberCandidate = extractCardNumber(lines);
  if (cardNumberCandidate) {
    result.cardNumber = cardNumberCandidate.digits;
  }

  applyDates(result, lines);

  const bankName = extractBankName(lines);
  if (bankName) result.bankName = bankName;

  const cardType = extractCardType(lines);
  if (cardType) result.cardType = cardType;

  const cardHolderName = extractCardholderName(lines, cardNumberCandidate);
  if (cardHolderName) result.cardHolderName = cardHolderName;

  return result;
}

export function parseCVVFromOCR(
  input: OCRInput,
  brand?: CardBrand,
): string | undefined {
  const lines = getNormalizedLines(input);
  const joined = buildJoinedText(lines);
  const normalized = normalizeDigitLike(joined.replace(/\n/g, ' '));

  const labeled = normalized.match(/\b(?:CVV2?|CVC2?|CID)\s*:?\s*(\d{3,4})\b/i);
  if (labeled) return labeled[1];

  if (typeof input !== 'string') {
    const structured = extractCVVFromStructuredLines(lines, brand);
    if (structured) return structured;
  }

  if (brand === 'amex') return undefined;

  const fallbackCandidates = [...normalized.matchAll(/(?<!\d)(\d{3,4})(?!\d)/g)]
    .map((match) => match[1])
    .map((digits) => ({ digits, score: digits.length === 3 ? 1 : -1 }))
    .filter(({ digits }) => !(digits.length === 4 && /^20\d{2}$/.test(digits)))
    .sort((a, b) => b.score - a.score);

  return fallbackCandidates[0]?.digits;
}
