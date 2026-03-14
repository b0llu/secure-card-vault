/**
 * CardView.tsx
 *
 * Visual credit card component with gradient background.
 * Shows masked number, cardholder name, expiry, and optionally CVV.
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../types';
import {
  getBrandDisplayName,
  maskCardNumber,
  formatExpiry,
} from '../utils/cardUtils';
import { getResolvedCardAppearance } from '../utils/cardAppearance';
import { shadows } from '../theme';

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
  const appearance = getResolvedCardAppearance(card);
  const brandLabel = getBrandDisplayName(card.brand, card.customBrandName);

  return (
    <LinearGradient
      colors={appearance.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1.2 }}
      style={[styles.card, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
    >
      <View style={[styles.overlayOrb, { backgroundColor: appearance.orbColor }]} />

      {/* Header row */}
      <View style={styles.header}>
        {card.nickname ? (
          <View
            style={[
              styles.nicknameBadge,
              {
                backgroundColor: appearance.badgeBackground,
                borderColor: appearance.badgeBorder,
              },
            ]}
          >
            <Text style={[styles.nickname, { color: appearance.accent }]}>
              {card.nickname}
            </Text>
          </View>
        ) : <View />}
        <Text style={[styles.brandLabel, { color: appearance.accent }]}>
          {brandLabel}
        </Text>
      </View>

      <View style={styles.metaRow}>
        {card.bankName ? (
          <Text style={[styles.bankName, { color: appearance.mutedText }]} numberOfLines={1}>
            {card.bankName}
          </Text>
        ) : null}
      </View>

      {/* EMV Chip */}
      <View style={styles.chipRow}>
        <View style={[styles.chip, { backgroundColor: appearance.chipBackground }]}>
          <View style={[styles.chipLine, { backgroundColor: appearance.chipLine }]} />
          <View style={[styles.chipLine, { backgroundColor: appearance.chipLine }]} />
          <View style={[styles.chipLine, { backgroundColor: appearance.chipLine }]} />
        </View>
      </View>

      {/* Card number */}
      <Text style={[styles.cardNumber, { color: appearance.text }]}>
        {maskCardNumber(card.cardNumber)}
      </Text>

      {/* Footer row */}
      <View style={styles.footer}>
        <View style={styles.footerCol}>
          <Text style={[styles.footerLabel, { color: appearance.labelText }]}>CARD HOLDER</Text>
          <Text style={[styles.footerValue, { color: appearance.text }]} numberOfLines={1}>
            {card.name || '—'}
          </Text>
        </View>

        <View style={styles.footerCol}>
          <Text style={[styles.footerLabel, { color: appearance.labelText }]}>EXPIRES</Text>
          <Text style={[styles.footerValue, { color: appearance.text }]}>
            {formatExpiry(card.expiryMonth, card.expiryYear)}
          </Text>
        </View>

        {showCVV && (
          <View style={styles.footerCol}>
            <Text style={[styles.footerLabel, { color: appearance.labelText }]}>CVV</Text>
            <Text style={[styles.footerValue, { color: appearance.text }]}>{card.cvv}</Text>
          </View>
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
    borderWidth: 1,
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
    borderRadius: 8,
    justifyContent: 'space-evenly',
    paddingVertical: 4,
    paddingHorizontal: 5,
    overflow: 'hidden',
  },
  chipLine: {
    height: 1.5,
    marginHorizontal: 2,
  },
  cardNumber: {
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
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  footerValue: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
});
