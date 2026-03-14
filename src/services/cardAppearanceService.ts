import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system';
import {
  SaveFormat,
  manipulateAsync,
} from 'expo-image-manipulator';
import { getColors, type ImageColorsResult } from 'react-native-image-colors';

import { normalizeHexColor } from '../utils/cardAppearance';

const FALLBACK_COLOR = '#222831';

interface RankedColorCandidate {
  color?: string;
  weight: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hexToRgb(color: string): { r: number; g: number; b: number } {
  const normalized = normalizeHexColor(color) ?? FALLBACK_COLOR;
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

function rgbToHsl(color: string): HSL {
  const { r, g, b } = hexToRgb(color);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: lightness };
  }

  const delta = max - min;
  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let hue = 0;
  switch (max) {
    case red:
      hue = (green - blue) / delta + (green < blue ? 6 : 0);
      break;
    case green:
      hue = (blue - red) / delta + 2;
      break;
    default:
      hue = (red - green) / delta + 4;
      break;
  }

  return { h: hue / 6, s: saturation, l: lightness };
}

function scoreColor(color: string, weight: number): number {
  const normalized = normalizeHexColor(color);
  if (!normalized) return Number.NEGATIVE_INFINITY;

  const { s, l } = rgbToHsl(normalized);
  const saturationBoost = s * 1.8;
  const midToneBonus = 0.45 - Math.abs(l - 0.42);
  const neutralPenalty = s < 0.14 ? 0.45 : 0;
  const extremePenalty = l < 0.1 || l > 0.92 ? 0.2 : 0;

  return weight + saturationBoost + midToneBonus - neutralPenalty - extremePenalty;
}

function getRankedCandidates(result: ImageColorsResult): RankedColorCandidate[] {
  switch (result.platform) {
    case 'android':
      return [
        { color: result.vibrant, weight: 1.15 },
        { color: result.darkVibrant, weight: 1.05 },
        { color: result.lightVibrant, weight: 0.96 },
        { color: result.dominant, weight: 0.74 },
        { color: result.muted, weight: 0.52 },
        { color: result.average, weight: 0.36 },
        { color: result.darkMuted, weight: 0.28 },
        { color: result.lightMuted, weight: 0.24 },
      ];
    case 'ios':
      return [
        { color: result.primary, weight: 1.12 },
        { color: result.secondary, weight: 0.84 },
        { color: result.detail, weight: 0.72 },
        { color: result.background, weight: 0.3 },
      ];
    case 'web':
      return [
        { color: result.vibrant, weight: 1.08 },
        { color: result.darkVibrant, weight: 1.0 },
        { color: result.lightVibrant, weight: 0.92 },
        { color: result.dominant, weight: 0.7 },
        { color: result.muted, weight: 0.5 },
        { color: result.darkMuted, weight: 0.26 },
        { color: result.lightMuted, weight: 0.22 },
      ];
    default:
      return [];
  }
}

function extractBestColor(result: ImageColorsResult): string | undefined {
  const rankedCandidates = getRankedCandidates(result);
  const winner = rankedCandidates.reduce<{
    color?: string;
    score: number;
  }>(
    (best, candidate) => {
      const normalized = normalizeHexColor(candidate.color);
      if (!normalized) return best;

      const score = scoreColor(normalized, candidate.weight);
      return score > best.score ? { color: normalized, score } : best;
    },
    { color: undefined, score: Number.NEGATIVE_INFINITY },
  );

  return winner.color;
}

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject,
    );
  });
}

function getCenteredCardCrop(width: number, height: number) {
  const cropWidth = clamp(Math.round(width * 0.78), 1, width);
  const idealCardHeight = Math.round(cropWidth / 1.586);
  const cropHeight = clamp(
    Math.min(idealCardHeight, Math.round(height * 0.56)),
    1,
    height,
  );

  return {
    originX: Math.max(0, Math.round((width - cropWidth) / 2)),
    originY: Math.max(0, Math.round((height - cropHeight) / 2)),
    width: cropWidth,
    height: cropHeight,
  };
}

async function createCenteredCrop(uri: string): Promise<string | undefined> {
  try {
    const { width, height } = await getImageSize(uri);
    const crop = getCenteredCardCrop(width, height);
    const result = await manipulateAsync(
      uri,
      [{ crop }],
      { compress: 0.9, format: SaveFormat.JPEG },
    );

    return result.uri;
  } catch (error) {
    console.warn('[Appearance] Failed to crop image for color detection:', error);
    return undefined;
  }
}

async function readBestColorFromUri(uri: string, key: string): Promise<string | undefined> {
  const result = await getColors(uri, {
    fallback: FALLBACK_COLOR,
    cache: true,
    key,
    pixelSpacing: 3,
    quality: 'high',
  });

  return normalizeHexColor(extractBestColor(result) ?? FALLBACK_COLOR);
}

export async function detectCardThemeColor(sourceUri: string): Promise<string | undefined> {
  let croppedUri: string | undefined;

  try {
    croppedUri = await createCenteredCrop(sourceUri);
    const [croppedColor, originalColor] = await Promise.all([
      croppedUri ? readBestColorFromUri(croppedUri, `${sourceUri}:crop`) : Promise.resolve(undefined),
      readBestColorFromUri(sourceUri, `${sourceUri}:full`),
    ]);

    return croppedColor ?? originalColor ?? undefined;
  } catch (error) {
    console.warn('[Appearance] Failed to extract card color:', error);
    return undefined;
  } finally {
    if (croppedUri && croppedUri !== sourceUri) {
      FileSystem.deleteAsync(croppedUri, { idempotent: true }).catch(() => {});
    }
  }
}
