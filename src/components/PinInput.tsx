/**
 * PinInput.tsx
 *
 * A custom PIN entry component.
 * Renders dot indicators and a numpad.
 * Supports 4–6 digit PINs.
 */

import React, { useCallback, useState } from 'react';
import {
  Animated,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  useWindowDimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { theme } from '../theme';

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

interface PinInputProps {
  maxLength?: number;
  minLength?: number;
  onComplete: (pin: string) => void;
  disabled?: boolean;
  label?: string;
  errorMessage?: string;
}

export const PinInput: React.FC<PinInputProps> = ({
  maxLength = 6,
  minLength = 4,
  onComplete,
  disabled = false,
  label = 'Enter PIN',
  errorMessage,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  // Reserve horizontal padding: container(8*2) + pinCard(18*2) + safe(24*2) = ~100
  const availableWidth = screenWidth - 100;
  // 3 keys + 2 gaps(16px each) = keySize*3 + 32; solve for keySize, clamp 56–76
  const keySize = Math.max(56, Math.min(76, Math.floor((availableWidth - 32) / 3)));
  const keyGap = Math.max(8, Math.min(16, Math.floor((availableWidth - keySize * 3) / 2)));
  const keyFontSize = keySize < 64 ? 20 : 24;

  const [pin, setPin] = useState('');
  const shakeX = React.useRef(new Animated.Value(0)).current;

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
    Vibration.vibrate(200);
  }, [shakeX]);

  // Trigger shake when errorMessage changes to a non-empty value
  React.useEffect(() => {
    if (errorMessage) {
      shake();
      setPin('');
    }
  }, [errorMessage, shake]);

  const handlePress = useCallback(
    (key: string) => {
      if (disabled) return;

      if (key === '⌫') {
        setPin((p) => p.slice(0, -1));
        return;
      }

      if (!key) return;

      const next = pin + key;
      setPin(next);

      if (next.length >= minLength && next.length === maxLength) {
        // Slight delay so last dot animates before callback
        setTimeout(() => {
          onComplete(next);
          setPin('');
        }, 100);
      } else if (next.length === maxLength && minLength === maxLength) {
        setTimeout(() => {
          onComplete(next);
          setPin('');
        }, 100);
      } else if (next.length >= minLength) {
        // For variable length, allow manual submit — handled elsewhere
        // For fixed max length, auto-submit when full
        if (next.length === maxLength) {
          setTimeout(() => {
            onComplete(next);
            setPin('');
          }, 100);
        }
      }
    },
    [disabled, maxLength, minLength, onComplete, pin],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label} allowFontScaling={false}>{label}</Text>

      {/* Dot indicators — announced as a group to screen readers */}
      <Animated.View
        style={[styles.dotsRow, { transform: [{ translateX: shakeX }] }]}
        accessible
        accessibilityLabel={`${pin.length} of ${maxLength} digits entered`}
      >
        {Array.from({ length: maxLength }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < pin.length ? styles.dotFilled : styles.dotEmpty,
            ]}
          />
        ))}
      </Animated.View>

      {errorMessage ? (
        <Text
          style={styles.errorText}
          allowFontScaling={false}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          {errorMessage}
        </Text>
      ) : null}

      {/* Numpad */}
      <View style={[styles.numpad, { gap: Math.max(8, Math.min(12, keyGap)) }]}>
        {KEYS.map((row, ri) => (
          <View key={ri} style={[styles.row, { gap: keyGap }]}>
            {row.map((key, ki) => (
              <TouchableOpacity
                key={ki}
                style={[
                  styles.key,
                  { width: keySize, height: keySize, borderRadius: keySize / 2 },
                  !key && styles.keyEmpty,
                ]}
                onPress={() => handlePress(key)}
                disabled={disabled || !key}
                activeOpacity={0.6}
                accessibilityRole="button"
                accessibilityLabel={key === '⌫' ? 'Delete' : key || undefined}
                accessibilityState={{ disabled: disabled || !key }}
              >
                {key === '⌫' ? (
                  <Feather
                    name="delete"
                    size={keyFontSize - 2}
                    color={theme.colors.text}
                  />
                ) : (
                  <Text style={[styles.keyText, { fontSize: keyFontSize }]} allowFontScaling={false}>{key}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
  },
  label: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 28,
    letterSpacing: 0.5,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 14,
    gap: 16,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dotFilled: {
    backgroundColor: theme.colors.primary,
  },
  dotEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.borderStrong,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  numpad: {
    marginTop: 24,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  key: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyEmpty: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  keyText: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '500',
  },
});
