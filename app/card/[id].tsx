import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '../../src/components/AppBackground';
import { AppModal, ModalConfig } from '../../src/components/AppModal';
import { CardView } from '../../src/components/CardView';
import { ThemedButton } from '../../src/components/ThemedButton';
import { deleteCard, getCardById } from '../../src/storage/database';
import { Card } from '../../src/types';
import { formatCardNumber, formatExpiry, getBrandDisplayName } from '../../src/utils/cardUtils';
import { theme } from '../../src/theme';

const CLIPBOARD_CLEAR_DELAY_MS = 20_000;

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [modal, setModal] = useState<ModalConfig | null>(null);

  const clipboardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const showToast = useCallback(
    (field: string) => {
      setCopiedField(field);
      Animated.sequence([
        Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1800),
        Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    },
    [toastOpacity],
  );

  useFocusEffect(
    useCallback(() => {
      (async () => {
        if (!id) return;
        const fetched = await getCardById(id);
        setCard(fetched);
        setLoading(false);
      })();

      return () => {
        if (clipboardTimer.current) {
          clearTimeout(clipboardTimer.current);
          Clipboard.setStringAsync('').catch(() => {});
        }
      };
    }, [id]),
  );

  const scheduleClipboardClear = () => {
    if (clipboardTimer.current) clearTimeout(clipboardTimer.current);
    clipboardTimer.current = setTimeout(async () => {
      await Clipboard.setStringAsync('');
    }, CLIPBOARD_CLEAR_DELAY_MS);
  };

  const handleCopyCardNumber = async () => {
    if (!card) return;
    await Clipboard.setStringAsync(card.cardNumber);
    showToast('Card number copied');
    scheduleClipboardClear();
  };

  const handleCopyCVV = async () => {
    if (!card) return;
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
    <>
      <AppBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardWrapper}>
            <CardView card={card} showNumber={true} />
          </View>

          <View style={styles.infoSection}>
            <InfoRow label="Cardholder" value={card.name} />
            <CopyInfoRow
              label="Card Number"
              value={formatCardNumber(card.cardNumber)}
              onCopy={handleCopyCardNumber}
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
            <CopyInfoRow
              label="CVV"
              value={card.cvv}
              onCopy={handleCopyCVV}
              mono
            />
            {card.bankName ? <InfoRow label="Bank" value={card.bankName} /> : null}
            {card.cardType ? <InfoRow label="Card Type" value={card.cardType} /> : null}
            {card.nickname ? <InfoRow label="Nickname" value={card.nickname} /> : null}
            <InfoRow hideBottomBorder label="Card Brand" value={getBrandDisplayName(card.brand, card.customBrandName)} />
          </View>
        </ScrollView>

        <View style={styles.deleteFooter}>
          <ThemedButton
            title="Edit"
            variant="secondary"
            onPress={() => router.push(`/edit-card/${card.id}`)}
            style={styles.footerBtn}
            icon={<Feather name="edit-2" size={18} color={theme.colors.text} />}
          />
          <ThemedButton
            title="Delete"
            variant="danger"
            onPress={handleDelete}
            loading={deleting}
            style={styles.footerBtn}
            icon={<Feather name="trash-2" size={18} color={theme.colors.danger} />}
          />
        </View>

        <Animated.View style={[styles.toast, { opacity: toastOpacity }]} pointerEvents="none">
          <Text
            style={styles.toastText}
            accessibilityLiveRegion="polite"
          >
            {copiedField}
          </Text>
        </Animated.View>
      </SafeAreaView>

      <AppModal config={modal} onDismiss={() => setModal(null)} />
    </AppBackground>
    </>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
  hideBottomBorder = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  hideBottomBorder?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel} allowFontScaling={false} numberOfLines={1}>{label}</Text>
      <Text style={[styles.infoValue, mono && styles.monoValue]} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

function CopyInfoRow({
  label,
  value,
  onCopy,
  mono = true,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  mono?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePress = () => {
    onCopy();
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TouchableOpacity
      style={styles.interactiveRow}
      onPress={handlePress}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel={`Copy ${label}`}
    >
      <Text style={styles.infoLabel} allowFontScaling={false} numberOfLines={1}>{label}</Text>

      <View style={styles.interactiveRight}>
        <Text style={[styles.infoValue, mono && styles.monoValue]} numberOfLines={1} allowFontScaling={false} adjustsFontSizeToFit>
          {value}
        </Text>

        <View style={[styles.copyIconBtn, copied && styles.copyIconBtnActive]}>
          <Feather
            name={copied ? 'check' : 'copy'}
            size={13}
            color={copied ? theme.colors.primary : theme.colors.textMuted}
          />
        </View>
      </View>
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
    padding: 10,
    paddingBottom: 20,
    gap: 18,
  },
  deleteFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  footerBtn: {
    flex: 1,
  },
  cardWrapper: {
    alignItems: 'center',
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
  interactiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 12,
  },
  interactiveRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  copyIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyIconBtnActive: {
    borderColor: 'rgba(184,184,184,0.4)',
    backgroundColor: theme.colors.primarySoft,
  },
  infoLabel: {
    color: theme.colors.textMuted,
    fontSize: 14,
    flexShrink: 0,
    maxWidth: '38%',
  },
  infoValue: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
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
