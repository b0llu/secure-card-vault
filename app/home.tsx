import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  SectionList,
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
  formatCardNumber,
  getBrandDisplayName,
  maskCardNumber,
} from '../src/utils/cardUtils';
import { getResolvedCardAppearance } from '../src/utils/cardAppearance';
import { theme } from '../src/theme';

type GroupingKey = 'none' | 'brand' | 'bank' | 'type' | 'expiry';

interface GroupingOption {
  key: GroupingKey;
  label: string;
}

function getExpiryBucket(expiryMonth: string, expiryYear: string): string {
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;

  const year = parseInt(expiryYear, 10);
  const month = parseInt(expiryMonth, 10);
  const normalizedYear = year > 100 ? year % 100 : year;

  if (
    normalizedYear < currentYear ||
    (normalizedYear === currentYear && month < currentMonth)
  ) {
    return 'Expired';
  }

  const expiryDate = new Date(2000 + normalizedYear, month - 1);
  const sixMonthsFromNow = new Date(now.getFullYear(), now.getMonth() + 6);

  if (expiryDate <= sixMonthsFromNow) {
    return 'Expiring Soon';
  }

  return 'Valid';
}

function groupCards(
  cards: Card[],
  grouping: GroupingKey,
): { title: string; data: Card[] }[] {
  if (cards.length === 0) return [];
  if (grouping === 'none') return [{ title: '', data: cards }];

  const groups = new Map<string, Card[]>();

  for (const card of cards) {
    let key: string;
    if (grouping === 'brand') {
      key = getBrandDisplayName(card.brand, card.customBrandName) || 'Unknown';
    } else if (grouping === 'bank') {
      key = card.bankName?.trim() || 'No Bank';
    } else if (grouping === 'type') {
      key = card.cardType?.trim() || 'Other';
    } else {
      key = getExpiryBucket(card.expiryMonth, card.expiryYear);
    }

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(card);
  }

  if (grouping === 'expiry') {
    const order = ['Expired', 'Expiring Soon', 'Valid'];
    return order
      .filter((k) => groups.has(k))
      .map((k) => ({ title: k, data: groups.get(k)! }));
  }

  return Array.from(groups.entries()).map(([title, data]) => ({ title, data }));
}

export default function HomeScreen() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [activeGrouping, setActiveGrouping] = useState<GroupingKey>('none');

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

  const availableGroupings = useMemo<GroupingOption[]>(() => {
    const options: GroupingOption[] = [{ key: 'none', label: 'None' }];

    const brands = new Set(cards.map((c) => getBrandDisplayName(c.brand, c.customBrandName) || 'Unknown'));
    if (brands.size >= 2) options.push({ key: 'brand', label: 'Brand' });

    const banks = new Set(cards.map((c) => c.bankName?.trim() || 'No Bank'));
    if (banks.size >= 2) options.push({ key: 'bank', label: 'Bank' });

    const types = new Set(cards.map((c) => c.cardType?.trim() || 'Other'));
    if (types.size >= 2) options.push({ key: 'type', label: 'Type' });

    const buckets = new Set(
      cards.map((c) => getExpiryBucket(c.expiryMonth, c.expiryYear)),
    );
    if (buckets.size >= 2) options.push({ key: 'expiry', label: 'Expiry' });

    return options;
  }, [cards]);

  const effectiveGrouping: GroupingKey = useMemo(() => {
    if (availableGroupings.some((g) => g.key === activeGrouping)) return activeGrouping;
    return 'none';
  }, [activeGrouping, availableGroupings]);

  const sections = useMemo(
    () => groupCards(cards, effectiveGrouping),
    [cards, effectiveGrouping],
  );

  const handleAddCard = () => {
    router.push('/add-card');
  };

  const renderCard = ({ item }: { item: Card }) => (
    <CardListItem item={item} onNavigate={() => router.push(`/card/${item.id}`)} />
  );

  const renderSectionHeader = ({
    section,
  }: {
    section: { title: string };
  }) => {
    if (!section.title) return null;
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>
          {section.title.toUpperCase()}
        </Text>
      </View>
    );
  };

  const showGroupingBar = availableGroupings.length > 1;

  const listEmptyComponent = loading ? (
    <View style={styles.emptyCard}>
      <ActivityIndicator color={theme.colors.primary} size="small" />
      <Text style={styles.emptyText}>Loading your vault…</Text>
    </View>
  ) : (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconWrap}>
        <Feather name="credit-card" size={22} color={theme.colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>No cards saved yet</Text>
      <Text style={styles.emptyText}>
        Scan your first card or add it manually to start building your vault.
      </Text>
    </View>
  );

  return (
    <AppBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.topChrome}>
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

          <View style={[styles.groupingBarShell, !showGroupingBar && styles.groupingBarShellHidden]}>
            {showGroupingBar ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.groupingBar}
                contentContainerStyle={styles.groupingBarContent}
              >
                {availableGroupings.map((option) => {
                  const isActive = effectiveGrouping === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      activeOpacity={0.75}
                      onPress={() => setActiveGrouping(option.key)}
                      style={[
                        styles.groupingPill,
                        isActive && styles.groupingPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.groupingPillText,
                          isActive && styles.groupingPillTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : null}
          </View>
        </View>

        <View style={styles.listWrap}>
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderCard}
            renderSectionHeader={renderSectionHeader}
            showsVerticalScrollIndicator={false}
            SectionSeparatorComponent={() => (
              <View style={styles.sectionSeparator} />
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={[
              styles.list,
              cards.length === 0 && !loading ? styles.listEmptyState : null,
            ]}
            ListEmptyComponent={listEmptyComponent}
            stickySectionHeadersEnabled={false}
          />
        </View>

        <View style={styles.footer}>
          <LinearGradient
            colors={['rgba(8,8,8,0)', 'rgba(8,8,8,0.96)']}
            style={styles.footerGradient}
            pointerEvents="none"
          />
          <ThemedButton
            title="Add Card"
            onPress={handleAddCard}
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

const REVEAL_MS = 5_000;

function CardListItem({ item, onNavigate }: { item: Card; onNavigate: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const appearance = getResolvedCardAppearance(item);
  const brandLabel = getBrandDisplayName(item.brand, item.customBrandName) || 'STORED CARD';

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      animRef.current?.stop();
    };
  }, []);

  const startReveal = () => {
    progressAnim.setValue(1);
    animRef.current = Animated.timing(progressAnim, {
      toValue: 0,
      duration: REVEAL_MS,
      useNativeDriver: false,
    });
    animRef.current.start();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setRevealed(false);
      progressAnim.setValue(1);
    }, REVEAL_MS);
  };

  const handleReveal = () => {
    if (revealed) {
      setRevealed(false);
      animRef.current?.stop();
      progressAnim.setValue(1);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    setRevealed(true);
    startReveal();
  };

  return (
    <TouchableOpacity activeOpacity={0.84} onPress={onNavigate}>
      <LinearGradient
        colors={appearance.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardRow}
      >
        {/* Countdown sweep overlay — adapts to card brightness */}
        {revealed && (
          <View style={styles.cardSweepTrack} pointerEvents="none">
            <Animated.View
              style={[
                styles.cardSweepFill,
                {
                  backgroundColor: appearance.text === '#FFFFFF'
                    ? 'rgba(255,255,255,0.07)'
                    : 'rgba(8,16,25,0.10)',
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        )}

        {/* Brand + nickname */}
        <View style={styles.cardRowTop}>
          <Text style={[styles.cardBrand, { color: appearance.mutedText }]}>
            {brandLabel}
          </Text>
          {item.nickname ? (
            <View
              style={[
                styles.cardNicknamePill,
                {
                  backgroundColor: appearance.badgeBackground,
                  borderColor: appearance.badgeBorder,
                },
              ]}
            >
              <Text style={[styles.cardNicknamePillText, { color: appearance.text }]}>
                {item.nickname}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Card number */}
        <Text style={[styles.cardNumber, { color: appearance.text }]}>
          {revealed ? formatCardNumber(item.cardNumber) : maskCardNumber(item.cardNumber)}
        </Text>

        {/* CVV row */}
        <View style={styles.cardCvvRow}>
          <Text style={[styles.cardCvvLabel, { color: appearance.mutedText }]}>CVV</Text>
          <Text
            style={[
              styles.cardCvvValue,
              { color: revealed ? appearance.text : appearance.mutedText },
            ]}
          >
            {revealed ? item.cvv : item.cvv.length === 4 ? '••••' : '•••'}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.cardFooterCopy}>
            <Text style={[styles.cardFooterName, { color: appearance.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.bankName ? (
              <Text style={[styles.cardFooterMeta, { color: appearance.mutedText }]} numberOfLines={1}>
                {item.bankName}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={handleReveal}
            style={[
              styles.revealPill,
              {
                borderColor: revealed ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.18)',
                backgroundColor: revealed ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
              },
            ]}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather
              name={revealed ? 'eye-off' : 'eye'}
              size={12}
              color={revealed ? appearance.text : appearance.mutedText}
            />
            <Text style={[styles.revealPillText, { color: revealed ? appearance.text : appearance.mutedText }]}>
              {revealed ? 'Hide' : 'Reveal'}
            </Text>
          </TouchableOpacity>

          <Feather name="chevron-right" size={18} color={appearance.chevronColor} />
        </View>

      </LinearGradient>
    </TouchableOpacity>
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  topChrome: {
    flexShrink: 0,
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
  headerTitle: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '700',
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
  groupingBar: {
    flexGrow: 0,
  },
  groupingBarShell: {
    minHeight: 48,
    justifyContent: 'center',
  },
  groupingBarShellHidden: {
    minHeight: 0,
  },
  groupingBarContent: {
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 10,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupingPill: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupingPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  groupingPillText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
  },
  groupingPillTextActive: {
    color: theme.colors.primaryInk,
  },
  listWrap: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 10,
    paddingTop: 0,
    paddingBottom: 75,
  },
  listEmptyState: {
    flexGrow: 1,
    paddingBottom: 75,
  },
  separator: {
    height: 14,
  },
  sectionSeparator: {
    height: 6,
  },
  sectionHeader: {
    paddingTop: 18,
    paddingBottom: 10,
  },
  sectionHeaderText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
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
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    flex: 1,
  },
  cardNicknamePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  cardNicknamePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardNumber: {
    fontSize: 19,
    fontWeight: '600',
    letterSpacing: 2.8,
  },
  cardCvvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardCvvLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.0,
  },
  cardCvvValue: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.6,
  },
  revealPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  revealPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardSweepTrack: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: 24,
  },
  cardSweepFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
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
    fontSize: 14,
    fontWeight: '600',
  },
  cardFooterMeta: {
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
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 15,
    paddingBottom: 32,
  },
  footerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -36,
    bottom: 0,
  },
});
