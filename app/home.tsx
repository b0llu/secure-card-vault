import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '../src/components/AppBackground';
import { AppModal, ModalConfig } from '../src/components/AppModal';
import { ThemedButton } from '../src/components/ThemedButton';
import { Card } from '../src/types';
import { getCardCount, getCards } from '../src/storage/database';
import {
  getBrandGradient,
  getBrandLabel,
  maskCardNumber,
} from '../src/utils/cardUtils';
import { theme } from '../src/theme';

const FREE_LIMIT = 3;

export default function HomeScreen() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalConfig | null>(null);

  const remainingSlots = Math.max(FREE_LIMIT - count, 0);

  const usageLabel = useMemo(() => {
    if (count === 0) {
      return `0/${FREE_LIMIT} cards stored`;
    }

    if (remainingSlots === 0) {
      return `${count}/${FREE_LIMIT} cards stored · vault full`;
    }

    return `${count}/${FREE_LIMIT} cards stored · ${remainingSlots} slot${remainingSlots === 1 ? '' : 's'} left`;
  }, [count, remainingSlots]);

  const loadCards = useCallback(async () => {
    setLoading(true);
    const [fetched, total] = await Promise.all([getCards(), getCardCount()]);
    setCards(fetched);
    setCount(total);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCards();
    }, [loadCards]),
  );

  const handleAddCard = () => {
    if (count >= FREE_LIMIT) {
      setModal({
        title: 'Card Limit Reached',
        message: 'Free version supports up to 3 cards. Delete a card to add a new one.',
        buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
      });
      return;
    }

    router.push('/add-card');
  };

  const renderCard = ({ item }: { item: Card }) => {
    const gradient = getBrandGradient(item.brand);
    const brandLabel = getBrandLabel(item.brand) || 'STORED CARD';

    return (
      <TouchableOpacity
        activeOpacity={0.84}
        onPress={() => router.push(`/card/${item.id}`)}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardRow}
        >
          <View style={styles.cardRowTop}>
            <Text style={styles.cardBrand}>{brandLabel}</Text>
            {item.nickname ? (
              <View style={styles.cardNicknamePill}>
                <Text style={styles.cardNicknamePillText}>{item.nickname}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.cardNumber}>{maskCardNumber(item.cardNumber)}</Text>

          <View style={styles.cardFooter}>
            <View style={styles.cardFooterCopy}>
              <Text style={styles.cardFooterName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.cardFooterMeta} numberOfLines={1}>
                {item.bankName}
              </Text>
            </View>
            <Feather
              name="chevron-right"
              size={18}
              color="rgba(255,255,255,0.72)"
            />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <AppBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Card Vault</Text>
          </View>

          <View style={styles.headerActions}>
            <HeaderAction
              icon="shield"
              label="Security"
              onPress={() => router.push('/security')}
            />
            <HeaderAction
              icon="settings"
              label="Settings"
              onPress={() => router.push('/settings')}
            />
          </View>
        </View>

        <FlatList
          data={cards}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={[
            styles.list,
            cards.length === 0 && !loading ? styles.listEmptyState : null,
          ]}
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyCard}>
                <ActivityIndicator color={theme.colors.primary} size="small" />
                <Text style={styles.emptyText}>Loading your vault…</Text>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <Feather
                    name="credit-card"
                    size={22}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={styles.emptyTitle}>No cards saved yet</Text>
                <Text style={styles.emptyText}>
                  Scan your first card or add it manually to start building your
                  vault.
                </Text>
              </View>
            )
          }
        />

        <View style={styles.footer}>
          <ThemedButton
            title="Add Card"
            onPress={handleAddCard}
            disabled={count >= FREE_LIMIT}
            icon={
              <Feather
                name="plus"
                size={18}
                color={theme.colors.primaryInk}
              />
            }
          />
        </View>
      </SafeAreaView>

      <AppModal config={modal} onDismiss={() => setModal(null)} />
    </AppBackground>
  );
}

function HeaderAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityLabel={label}
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.headerAction}
    >
      <Feather name={icon} size={18} color={theme.colors.text} />
    </TouchableOpacity>
  );
}

function InfoPill({ label }: { label: string }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoPillText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  headerEyebrow: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 4,
  },
  headerAction: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 140,
  },
  listEmptyState: {
    flexGrow: 1,
  },
  heroCard: {
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceElevated,
    marginBottom: 20,
    gap: 12,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.primarySoft,
  },
  heroBadgeText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroUsagePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  heroUsageText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  heroText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  infoPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoPillText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  separator: {
    height: 14,
  },
  cardRow: {
    borderRadius: 24,
    padding: 18,
    gap: 18,
  },
  cardRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  cardBrand: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    flex: 1,
  },
  cardNicknamePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  cardNicknamePillText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  cardNumber: {
    color: theme.colors.white,
    fontSize: 19,
    fontWeight: '600',
    letterSpacing: 2.8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardFooterCopy: {
    flex: 1,
    gap: 2,
  },
  cardFooterName: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  cardFooterMeta: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 12,
  },
  emptyCard: {
    flex: 1,
    minHeight: 220,
    backgroundColor: theme.colors.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 280,
  },
  footer: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 18,
    gap: 10,
  },
  footerHint: {
    color: theme.colors.textSubtle,
    fontSize: 12,
    textAlign: 'center',
  },
});
