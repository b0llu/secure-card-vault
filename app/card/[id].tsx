/**
 * card/[id].tsx
 *
 * Card detail screen.
 *
 * Shows the visual card, allows copying card number/expiry,
 * reveals CVV temporarily, and allows deleting the card.
 *
 * Security features:
 *  - CVV hidden by default, auto-hides after 5 seconds
 *  - Card number copied to clipboard is cleared after 20 seconds
 *  - Uses Clipboard.setStringAsync for both set and clear
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';

import { getCardById, deleteCard } from '../../src/storage/database';
import { Card } from '../../src/types';
import { CardView } from '../../src/components/CardView';
import { ThemedButton } from '../../src/components/ThemedButton';
import { formatExpiry, formatCardNumber } from '../../src/utils/cardUtils';

const CVV_REVEAL_DURATION_MS = 5_000;
const CLIPBOARD_CLEAR_DELAY_MS = 20_000;

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCVV, setShowCVV] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const cvvTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clipboardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Toast animation
  const toastOpacity = useSharedValue(0);
  const toastStyle = useAnimatedStyle(() => ({
    opacity: toastOpacity.value,
  }));

  const showToast = useCallback(
    (field: string) => {
      setCopiedField(field);
      toastOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(1800, withTiming(0, { duration: 300 })),
      );
    },
    [toastOpacity],
  );

  useEffect(() => {
    (async () => {
      if (!id) return;
      const fetched = await getCardById(id);
      setCard(fetched);
      setLoading(false);
    })();

    return () => {
      if (cvvTimer.current) clearTimeout(cvvTimer.current);
      if (clipboardTimer.current) clearTimeout(clipboardTimer.current);
    };
  }, [id]);

  const handleRevealCVV = () => {
    setShowCVV(true);
    if (cvvTimer.current) clearTimeout(cvvTimer.current);
    cvvTimer.current = setTimeout(() => setShowCVV(false), CVV_REVEAL_DURATION_MS);
  };

  const handleCopyCardNumber = async () => {
    if (!card) return;
    const formatted = formatCardNumber(card.cardNumber);
    await Clipboard.setStringAsync(formatted);
    showToast('Card number copied');

    // Auto-clear clipboard after 20 seconds
    if (clipboardTimer.current) clearTimeout(clipboardTimer.current);
    clipboardTimer.current = setTimeout(async () => {
      await Clipboard.setStringAsync('');
    }, CLIPBOARD_CLEAR_DELAY_MS);
  };

  const handleCopyExpiry = async () => {
    if (!card) return;
    const expiry = formatExpiry(card.expiryMonth, card.expiryYear);
    await Clipboard.setStringAsync(expiry);
    showToast('Expiry copied');
  };

  const handleCopyCVV = async () => {
    if (!card) return;
    if (!showCVV) {
      handleRevealCVV();
      return;
    }
    await Clipboard.setStringAsync(card.cvv);
    showToast('CVV copied');

    if (clipboardTimer.current) clearTimeout(clipboardTimer.current);
    clipboardTimer.current = setTimeout(async () => {
      await Clipboard.setStringAsync('');
    }, CLIPBOARD_CLEAR_DELAY_MS);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Card',
      'Are you sure you want to delete this card? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!card) return;
            setDeleting(true);
            await deleteCard(card.id);
            router.back();
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color="#00C896" size="large" />
      </View>
    );
  }

  if (!card) {
    return (
      <View style={styles.loader}>
        <Text style={styles.errorText}>Card not found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Visual card */}
        <View style={styles.cardWrapper}>
          <CardView card={card} showCVV={showCVV} />
        </View>

        {/* Card info rows */}
        <View style={styles.infoSection}>
          <InfoRow label="Cardholder" value={card.name} />
          <InfoRow
            label="Card Number"
            value={formatCardNumber(card.cardNumber)}
            mono
          />
          {card.validFromMonth && card.validFromYear ? (
            <InfoRow
              label="Valid From"
              value={formatExpiry(card.validFromMonth, card.validFromYear)}
            />
          ) : null}
          <InfoRow
            label="Expiry"
            value={formatExpiry(card.expiryMonth, card.expiryYear)}
          />
          <InfoRow
            label="CVV"
            value={showCVV ? card.cvv : (card.cvv.length === 4 ? '••••' : '•••')}
            mono
          />
          {card.bankName ? (
            <InfoRow label="Bank" value={card.bankName} />
          ) : null}
          {card.cardType ? (
            <InfoRow label="Card Type" value={card.cardType} />
          ) : null}
          {card.nickname ? (
            <InfoRow label="Nickname" value={card.nickname} />
          ) : null}
          <InfoRow label="Network" value={card.brand.toUpperCase()} />
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <ActionButton
            icon="📋"
            label="Copy Card Number"
            onPress={handleCopyCardNumber}
          />
          <ActionButton
            icon="📅"
            label="Copy Expiry"
            onPress={handleCopyExpiry}
          />
          <ActionButton
            icon={showCVV ? '🙈' : '👁'}
            label={showCVV ? `CVV visible (tap to copy)` : 'Reveal CVV'}
            onPress={handleCopyCVV}
            accent={showCVV}
          />
        </View>

        <View style={styles.dangerZone}>
          <ThemedButton
            title="Delete Card"
            variant="danger"
            onPress={handleDelete}
            loading={deleting}
          />
        </View>

        {/* Clipboard notice */}
        <Text style={styles.clipboardNotice}>
          ⏱ Card number is cleared from clipboard after 20 seconds.
        </Text>
      </ScrollView>

      {/* Floating toast */}
      <Animated.View style={[styles.toast, toastStyle]} pointerEvents="none">
        <Text style={styles.toastText}>{copiedField}</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

// ── Small components ──────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, mono && styles.monoValue]}>
        {value}
      </Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  accent = false,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  accent?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={[styles.actionLabel, accent && styles.actionLabelAccent]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0E0E0E',
  },
  loader: {
    flex: 1,
    backgroundColor: '#0E0E0E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF453A',
    fontSize: 16,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    gap: 24,
  },
  cardWrapper: {
    alignItems: 'center',
  },
  infoSection: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  infoLabel: {
    color: '#8E8E93',
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'right',
    flex: 2,
  },
  monoValue: {
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  actions: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    overflow: 'hidden',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    gap: 12,
  },
  actionIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  actionLabelAccent: {
    color: '#00C896',
  },
  dangerZone: {
    marginTop: 8,
  },
  clipboardNotice: {
    color: '#555558',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  toast: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    backgroundColor: 'rgba(30,30,30,0.92)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
