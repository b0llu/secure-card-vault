import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AppBackground } from '../../src/components/AppBackground';
import { AppModal, ModalConfig } from '../../src/components/AppModal';
import { CardView } from '../../src/components/CardView';
import { ThemedButton } from '../../src/components/ThemedButton';
import { deleteCard, getCardById } from '../../src/storage/database';
import { Card } from '../../src/types';
import { formatCardNumber, formatExpiry, maskCardNumber } from '../../src/utils/cardUtils';
import { theme } from '../../src/theme';

const REVEAL_DURATION_MS = 5_000;
const CLIPBOARD_CLEAR_DELAY_MS = 20_000;

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCVV, setShowCVV] = useState(false);
  const [showNumber, setShowNumber] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [modal, setModal] = useState<ModalConfig | null>(null);

  const cvvTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const numberTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clipboardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (numberTimer.current) clearTimeout(numberTimer.current);
      if (clipboardTimer.current) clearTimeout(clipboardTimer.current);
    };
  }, [id]);

  const scheduleClipboardClear = () => {
    if (clipboardTimer.current) clearTimeout(clipboardTimer.current);
    clipboardTimer.current = setTimeout(async () => {
      await Clipboard.setStringAsync('');
    }, CLIPBOARD_CLEAR_DELAY_MS);
  };

  const handleRevealCVV = () => {
    setShowCVV(true);
    if (cvvTimer.current) clearTimeout(cvvTimer.current);
    cvvTimer.current = setTimeout(() => setShowCVV(false), REVEAL_DURATION_MS);
  };

  const handleRevealNumber = () => {
    setShowNumber(true);
    if (numberTimer.current) clearTimeout(numberTimer.current);
    numberTimer.current = setTimeout(() => setShowNumber(false), REVEAL_DURATION_MS);
  };

  const handleCopyCardNumber = async () => {
    if (!card) return;
    if (!showNumber) {
      handleRevealNumber();
      return;
    }
    await Clipboard.setStringAsync(card.cardNumber);
    showToast('Card number copied');
    scheduleClipboardClear();
  };

  const handleCopyCVV = async () => {
    if (!card) return;
    if (!showCVV) {
      handleRevealCVV();
      return;
    }
    await Clipboard.setStringAsync(card.cvv);
    showToast('CVV copied');
    scheduleClipboardClear();
  };

  const handleDelete = () => {
    setModal({
      title: 'Delete Card',
      message: 'Are you sure you want to delete this card? This action cannot be undone.',
      buttons: [
        {
          label: 'Delete',
          variant: 'danger',
          onPress: async () => {
            if (!card) return;
            setDeleting(true);
            await deleteCard(card.id);
            router.back();
          },
        },
        { label: 'Cancel', variant: 'ghost', onPress: () => {} },
      ],
    });
  };

  if (loading) {
    return (
      <AppBackground>
        <View style={styles.loader}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      </AppBackground>
    );
  }

  if (!card) {
    return (
      <AppBackground>
        <View style={styles.loader}>
          <Text style={styles.errorText}>Card not found.</Text>
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardWrapper}>
            <CardView card={card} showCVV={showCVV} />
          </View>

          <View style={styles.infoSection}>
            <InfoRow label="Cardholder" value={card.name} />
            <InfoRow
              label="Card Number"
              value={showNumber ? formatCardNumber(card.cardNumber) : maskCardNumber(card.cardNumber)}
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
              value={showCVV ? card.cvv : card.cvv.length === 4 ? '••••' : '•••'}
              mono
            />
            {card.bankName ? <InfoRow label="Bank" value={card.bankName} /> : null}
            {card.cardType ? <InfoRow label="Card Type" value={card.cardType} /> : null}
            {card.nickname ? <InfoRow label="Nickname" value={card.nickname} /> : null}
            <InfoRow label="Network" value={card.brand.toUpperCase()} />
          </View>

          <View style={styles.actionsGrid}>
            <ActionButton
              icon={showNumber ? 'copy' : 'eye'}
              label={showNumber ? 'Copy Number' : 'Reveal Number'}
              onPress={handleCopyCardNumber}
              accent={showNumber}
            />
            <ActionButton
              icon={showCVV ? 'copy' : 'eye'}
              label={showCVV ? 'Copy CVV' : 'Reveal CVV'}
              onPress={handleCopyCVV}
              accent={showCVV}
            />
          </View>
        </ScrollView>

        <View style={styles.deleteFooter}>
          <ThemedButton
            title="Delete Card"
            variant="danger"
            onPress={handleDelete}
            loading={deleting}
            icon={<Feather name="trash-2" size={18} color={theme.colors.danger} />}
          />
        </View>

        <Animated.View style={[styles.toast, toastStyle]} pointerEvents="none">
          <Text style={styles.toastText}>{copiedField}</Text>
        </Animated.View>
      </SafeAreaView>

      <AppModal config={modal} onDismiss={() => setModal(null)} />
    </AppBackground>
  );
}

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
      <Text style={[styles.infoValue, mono && styles.monoValue]}>{value}</Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  accent = false,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
  accent?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionButton, accent && styles.actionButtonAccent]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={[styles.actionIconWrap, accent && styles.actionIconWrapAccent]}>
        <Feather
          name={icon}
          size={18}
          color={accent ? theme.colors.primaryInk : theme.colors.primary}
        />
      </View>
      <Text style={[styles.actionLabel, accent && styles.actionLabelAccent]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 16,
  },
  container: {
    padding: 20,
    paddingBottom: 20,
    gap: 18,
  },
  deleteFooter: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  cardWrapper: {
    alignItems: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 6,
  },
  actionButtonAccent: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.borderStrong,
  },
  actionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconWrapAccent: {
    backgroundColor: theme.colors.primary,
  },
  actionLabel: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionLabelAccent: {
    color: theme.colors.primary,
  },
  infoSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 12,
  },
  infoLabel: {
    color: theme.colors.textMuted,
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'right',
    flex: 2,
  },
  monoValue: {
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.4,
  },
  toast: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    backgroundColor: 'rgba(12,10,8,0.94)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  toastText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
