import type { Card, CardBrand } from '../types';
import { getBrandAccent, getBrandGradient } from './cardUtils';

export interface ResolvedCardAppearance {
  gradient: [string, string];
  accent: string;
  text: string;
  mutedText: string;
  labelText: string;
  badgeBackground: string;
  badgeBorder: string;
  orbColor: string;
  chipBackground: string;
  chipLine: string;
  chevronColor: string;
}

export const CARD_COLOR_PRESETS: Array<{ label: string; value: string }> = [
  { label: 'Charcoal', value: '#222831' },
  { label: 'Midnight', value: '#0B1F3A' },
  { label: 'Cobalt', value: '#21559A' },
  { label: 'Teal', value: '#0D6E6E' },
  { label: 'Emerald', value: '#116149' },
  { label: 'Burgundy', value: '#7A263A' },
  { label: 'Bronze', value: '#7B583C' },
  { label: 'Slate', value: '#5E6B7A' },
  { label: 'Plum', value: '#5B416E' },
];

const LIGHT_TEXT = '#FFFFFF';
const DARK_TEXT = '#081019';

interface RGB {
  r: number;
  g: number;
  b: number;
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(color: string): RGB {
  const normalized = normalizeHexColor(color) ?? '#000000';
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }: RGB): string {
  return `#${clampChannel(r).toString(16).padStart(2, '0')}${clampChannel(g)
    .toString(16)
    .padStart(2, '0')}${clampChannel(b).toString(16).padStart(2, '0')}`.toUpperCase();
}

function mixColors(from: string, to: string, amount: number): string {
  const start = hexToRgb(from);
  const end = hexToRgb(to);
  const mix = {
    r: start.r + (end.r - start.r) * amount,
    g: start.g + (end.g - start.g) * amount,
    b: start.b + (end.b - start.b) * amount,
  };

  return rgbToHex(mix);
}

function relativeLuminance(color: string): number {
  const { r, g, b } = hexToRgb(color);
  const channels = [r, g, b].map((value) => {
    const scaled = value / 255;
    return scaled <= 0.03928
      ? scaled / 12.92
      : ((scaled + 0.055) / 1.055) ** 2.4;
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getContrastText(color: string): string {
  return relativeLuminance(color) > 0.5 ? DARK_TEXT : LIGHT_TEXT;
}

export function normalizeHexColor(value?: string): string | undefined {
  if (!value) return undefined;

  const cleaned = value.trim().replace(/^#/, '').replace(/[^0-9A-Fa-f]/g, '');
  if (cleaned.length === 3) {
    return `#${cleaned
      .split('')
      .map((char) => `${char}${char}`)
      .join('')
      .toUpperCase()}`;
  }
  if (cleaned.length !== 6) return undefined;

  return `#${cleaned.toUpperCase()}`;
}

export function buildGradientFromColor(color: string): [string, string] {
  const normalized = normalizeHexColor(color) ?? '#222831';
  const luminance = relativeLuminance(normalized);
  const lightMix = luminance < 0.2 ? 0.18 : luminance < 0.5 ? 0.1 : 0.05;
  const darkMix = luminance > 0.72 ? 0.24 : 0.18;

  return [
    mixColors(normalized, LIGHT_TEXT, lightMix),
    mixColors(normalized, '#000000', darkMix),
  ];
}

export function getResolvedCardAppearance(
  card: Pick<Card, 'brand' | 'themeColor'>,
): ResolvedCardAppearance {
  const themeColor = normalizeHexColor(card.themeColor);

  if (!themeColor) {
    return {
      gradient: getBrandGradient(card.brand),
      accent: getBrandAccent(card.brand),
      text: LIGHT_TEXT,
      mutedText: 'rgba(255,255,255,0.68)',
      labelText: 'rgba(255,255,255,0.56)',
      badgeBackground: 'rgba(255,255,255,0.12)',
      badgeBorder: 'rgba(255,255,255,0.16)',
      orbColor: 'rgba(255,255,255,0.08)',
      chipBackground: '#C8C8C8',
      chipLine: 'rgba(0,0,0,0.25)',
      chevronColor: 'rgba(255,255,255,0.72)',
    };
  }

  const gradient = buildGradientFromColor(themeColor);
  const midpoint = mixColors(gradient[0], gradient[1], 0.5);
  const text = getContrastText(midpoint);
  const darkText = text === DARK_TEXT;

  return {
    gradient,
    accent: darkText
      ? mixColors(themeColor, DARK_TEXT, 0.58)
      : mixColors(themeColor, LIGHT_TEXT, 0.62),
    text,
    mutedText: darkText ? rgba(DARK_TEXT, 0.7) : rgba(LIGHT_TEXT, 0.72),
    labelText: darkText ? rgba(DARK_TEXT, 0.56) : rgba(LIGHT_TEXT, 0.58),
    badgeBackground: darkText ? rgba(DARK_TEXT, 0.08) : rgba(LIGHT_TEXT, 0.14),
    badgeBorder: darkText ? rgba(DARK_TEXT, 0.12) : rgba(LIGHT_TEXT, 0.18),
    orbColor: darkText ? rgba(LIGHT_TEXT, 0.26) : rgba(LIGHT_TEXT, 0.1),
    chipBackground: darkText ? '#E7DCC1' : '#D7D3CA',
    chipLine: 'rgba(0,0,0,0.24)',
    chevronColor: darkText ? rgba(DARK_TEXT, 0.62) : rgba(LIGHT_TEXT, 0.78),
  };
}

export function getBrandDefaultColor(brand: CardBrand): string {
  const [start] = getBrandGradient(brand);
  return start;
}
