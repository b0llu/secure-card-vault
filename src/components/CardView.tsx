/**
 * CardView.tsx
 *
 * Visual credit card component with gradient background.
 * Shows masked number, cardholder name, expiry, and optionally CVV.
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Card } from '../types';
import {
  maskCardNumber,
  formatExpiry,
  getBrandGradient,
  getBrandAccent,
  getBrandLabel,
} from '../utils/cardUtils';
import { shadows, theme } from '../theme';

const CARD_WIDTH = Math.min(Dimensions.get('window').width - 40, 390);
const CARD_HEIGHT = CARD_WIDTH * 0.6;

interface CardViewProps {
  card: Card;
  showCVV?: boolean;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  showCVV = false,
}) => {
  const gradient = getBrandGradient(card.brand);
  const accent = getBrandAccent(card.brand);
  const brandLabel = getBrandLabel(card.brand);

  const cvvStyle = useAnimatedStyle(() => ({
    opacity: withTiming(showCVV ? 1 : 0, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    }),
  }));

  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1.2 }}
      style={[styles.card, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
    >
      <View style={styles.overlayOrb} />

      {/* Header row */}
      <View style={styles.header}>
        {card.nickname ? (
          <View style={styles.nicknameBadge}>
            <Text style={[styles.nickname, { color: accent }]}>{card.nickname}</Text>
          </View>
        ) : <View />}
        <Text style={[styles.brandLabel, { color: accent }]}>
          {brandLabel}
        </Text>
      </View>

      <View style={styles.metaRow}>
        {card.bankName ? (
          <Text style={styles.bankName} numberOfLines={1}>
            {card.bankName}
          </Text>
        ) : null}
      </View>

      {/* EMV Chip */}
      <View style={styles.chipRow}>
        <View style={styles.chip}>
          <View style={styles.chipLine} />
          <View style={styles.chipLine} />
          <View style={styles.chipLine} />
        </View>
      </View>

      {/* Card number */}
      <Text style={styles.cardNumber}>{maskCardNumber(card.cardNumber)}</Text>

      {/* Footer row */}
      <View style={styles.footer}>
        <View style={styles.footerCol}>
          <Text style={styles.footerLabel}>CARD HOLDER</Text>
          <Text style={styles.footerValue} numberOfLines={1}>
            {card.name || '—'}
          </Text>
        </View>

        <View style={styles.footerCol}>
          <Text style={styles.footerLabel}>EXPIRES</Text>
          <Text style={styles.footerValue}>
            {formatExpiry(card.expiryMonth, card.expiryYear)}
          </Text>
        </View>

        {showCVV && (
          <Animated.View style={[styles.footerCol, cvvStyle]}>
            <Text style={styles.footerLabel}>CVV</Text>
            <Text style={styles.footerValue}>{card.cvv}</Text>
          </Animated.View>
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 24,
    justifyContent: 'space-between',
    overflow: 'hidden',
    ...shadows.floatingCard,
  },
  overlayOrb: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -50,
    right: -30,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  nicknameBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxWidth: '72%',
  },
  nickname: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
    opacity: 0.95,
  },
  brandLabel: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  metaRow: {
    marginTop: 6,
  },
  bankName: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  chipRow: {
    marginTop: 4,
  },
  chip: {
    width: 42,
    height: 30,
    backgroundColor: '#C8C8C8',
    borderRadius: 8,
    justifyContent: 'space-evenly',
    paddingVertical: 4,
    paddingHorizontal: 5,
    overflow: 'hidden',
  },
  chipLine: {
    height: 1.5,
    backgroundColor: 'rgba(0,0,0,0.25)',
    marginHorizontal: 2,
  },
  cardNumber: {
    color: theme.colors.white,
    fontSize: 20,
    fontWeight: '500',
    letterSpacing: 3.1,
    marginTop: 8,
    fontVariant: ['tabular-nums'],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 10,
  },
  footerCol: {
    flex: 1,
  },
  footerLabel: {
    color: 'rgba(255,255,255,0.56)',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  footerValue: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
});
