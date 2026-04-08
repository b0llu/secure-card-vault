/**
 * ColorPickerSimple
 *
 * Lightweight HSV color picker built on expo-linear-gradient + PanResponder.
 * Drop-in replacement for the reanimated-color-picker Panel1 + HueSlider combo,
 * with no additional dependencies beyond what the app already ships.
 */

import React, { useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ─── Color math ───────────────────────────────────────────────────────────────

function hexToHsv(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.substring(0, 2), 16) / 255;
  const g = parseInt(full.substring(2, 4), 16) / 255;
  const b = parseInt(full.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue = Math.round(hue * 60);
    if (hue < 0) hue += 360;
  }

  return [hue, max === 0 ? 0 : delta / max, max];
}

function hsvToHex(hue: number, sat: number, val: number): string {
  const c = val * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = val - c;

  let r = 0, g = 0, b = 0;
  if (hue < 60)       { r = c; g = x; }
  else if (hue < 120) { r = x; g = c; }
  else if (hue < 180) { g = c; b = x; }
  else if (hue < 240) { g = x; b = c; }
  else if (hue < 300) { r = x; b = c; }
  else                { r = c; b = x; }

  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (hex: string) => void;
  panelStyle?: ViewStyle;
  sliderStyle?: ViewStyle;
  thumbSize?: number;
  sliderThickness?: number;
}

export function ColorPickerSimple({
  value,
  onChange,
  panelStyle,
  sliderStyle,
  thumbSize = 28,
  sliderThickness = 22,
}: Props) {
  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(value));
  const [panelLayout, setPanelLayout] = useState({ w: 0, h: 0 });
  const [sliderW, setSliderW] = useState(0);

  // Refs let PanResponder handlers (created once) always read current values.
  const hsvRef = useRef(hsv);
  const panelLayoutRef = useRef(panelLayout);
  const sliderWRef = useRef(sliderW);
  const onChangeRef = useRef(onChange);

  useEffect(() => { hsvRef.current = hsv; }, [hsv]);
  useEffect(() => { panelLayoutRef.current = panelLayout; }, [panelLayout]);
  useEffect(() => { sliderWRef.current = sliderW; }, [sliderW]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Sync when the caller changes `value` externally (e.g. modal re-open).
  const lastExternal = useRef(value);
  useEffect(() => {
    if (value !== lastExternal.current) {
      lastExternal.current = value;
      const next = hexToHsv(value);
      hsvRef.current = next;
      setHsv(next);
    }
  }, [value]);

  const commitPanel = (x: number, y: number) => {
    const { w, h: ph } = panelLayoutRef.current;
    if (!w || !ph) return;
    const s = Math.max(0, Math.min(1, x / w));
    const v = Math.max(0, Math.min(1, 1 - y / ph));
    const [hue] = hsvRef.current;
    const next: [number, number, number] = [hue, s, v];
    hsvRef.current = next;
    setHsv(next);
    onChangeRef.current(hsvToHex(hue, s, v));
  };

  const commitSlider = (x: number) => {
    const sw = sliderWRef.current;
    if (!sw) return;
    const hue = Math.max(0, Math.min(359.9, (x / sw) * 360));
    const [, s, v] = hsvRef.current;
    const next: [number, number, number] = [hue, s, v];
    hsvRef.current = next;
    setHsv(next);
    onChangeRef.current(hsvToHex(hue, s, v));
  };

  const panelResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => commitPanel(e.nativeEvent.locationX, e.nativeEvent.locationY),
      onPanResponderMove: (e) => commitPanel(e.nativeEvent.locationX, e.nativeEvent.locationY),
    }),
  ).current;

  const sliderResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => commitSlider(e.nativeEvent.locationX),
      onPanResponderMove: (e) => commitSlider(e.nativeEvent.locationX),
    }),
  ).current;

  const [hue, sat, val] = hsv;
  const hueHex = hsvToHex(hue, 1, 1);
  const currentHex = hsvToHex(hue, sat, val);

  const panelThumbLeft = sat * (panelLayout.w || 0) - thumbSize / 2;
  const panelThumbTop = (1 - val) * (panelLayout.h || 0) - thumbSize / 2;
  const sliderThumbLeft = (hue / 360) * sliderW - thumbSize / 2;

  return (
    <View style={styles.container}>
      {/* Saturation / brightness panel */}
      <View
        style={[styles.panel, panelStyle]}
        onLayout={(e) =>
          setPanelLayout({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
        }
        {...panelResponder.panHandlers}
      >
        {/* Horizontal: white → hue */}
        <LinearGradient
          colors={['#ffffff', hueHex]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Vertical overlay: transparent → black */}
        <LinearGradient
          colors={['transparent', '#000000']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              left: panelThumbLeft,
              top: panelThumbTop,
              backgroundColor: currentHex,
            },
          ]}
        />
      </View>

      {/* Hue slider */}
      <View
        style={[
          styles.slider,
          { height: sliderThickness, borderRadius: sliderThickness / 2 },
          sliderStyle,
        ]}
        onLayout={(e) => setSliderW(e.nativeEvent.layout.width)}
        {...sliderResponder.panHandlers}
      >
        <LinearGradient
          colors={['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ff0000']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[StyleSheet.absoluteFill, { borderRadius: sliderThickness / 2 }]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              left: sliderThumbLeft,
              top: sliderThickness / 2 - thumbSize / 2,
              backgroundColor: hueHex,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  panel: {
    height: 220,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  slider: {
    position: 'relative',
    overflow: 'visible',
  },
  thumb: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.45,
    shadowRadius: 3,
    elevation: 4,
  },
});
