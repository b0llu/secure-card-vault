/**
 * home.tsx
 *
 * Main screen: lists stored cards and provides navigation to add/manage cards.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../src/types';
import { getCards, getCardCount } from '../src/storage/database';
import {
  maskCardNumber,
  getBrandGradient,
  getBrandLabel,
} from '../src/utils/cardUtils';
import { ThemedButton } from '../src/components/ThemedButton';
import { LinearGradient } from 'expo-linear-gradient';

const FREE_LIMIT = 3;

export default function HomeScreen() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadCards = useCallback(async () => {
    setLoading(true);
    const [fetched, total] = await Promise.all([getCards(), getCardCount()]);
    setCards(fetched);
    setCount(total);
    setLoading(false);
  }, []);

  // Reload when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadCards();
    }, [loadCards]),
  );

  const handleAddCard = () => {
    if (count >= FREE_LIMIT) {
      Alert.alert(
        'Card Limit Reached',
        'Free version supports up to 3 cards. Delete a card to add a new one.',
        [{ text: 'OK' }],
      );
      return;
    }
    router.push('/add-card');
  };

  const renderCard = ({ item }: { item: Card }) => {
    const gradient = getBrandGradient(item.brand);
    return (
      <TouchableOpacity
        onPress={() => router.push(`/card/${item.id}`)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardRow}
        >
          <View style={styles.cardRowLeft}>
            <Text style={styles.cardRowBrand}>{getBrandLabel(item.brand)}</Text>
            <Text style={styles.cardRowNumber}>
              {maskCardNumber(item.cardNumber)}
            </Text>
            {item.nickname ? (
              <Text style={styles.cardRowNickname}>{item.nickname}</Text>
            ) : null}
          </View>
          <Text style={styles.cardRowArrow}>›</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Card Vault</Text>
          <Text style={styles.headerSub}>
            {count}/{FREE_LIMIT} cards (Free)
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push('/security')}
            style={styles.headerBtn}
          >
            <Text style={styles.headerBtnText}>🔒</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Card list */}
      <FlatList
        data={cards}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💳</Text>
              <Text style={styles.emptyTitle}>No cards yet</Text>
              <Text style={styles.emptyText}>
                Add your first card to get started.
              </Text>
            </View>
          ) : null
        }
      />

      {/* Footer actions */}
      <View style={styles.footer}>
        <ThemedButton
          title="+ Add Card"
          onPress={handleAddCard}
          style={styles.addBtn}
          disabled={count >= FREE_LIMIT}
        />
        <View style={styles.footerSecondary}>
          <TouchableOpacity
            onPress={() => router.push('/export')}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>Export</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/import')}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>Import</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0E0E0E',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  headerSub: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnText: {
    fontSize: 20,
  },
  list: {
    padding: 20,
    paddingBottom: 8,
    flexGrow: 1,
  },
  separator: {
    height: 12,
  },
  cardRow: {
    borderRadius: 14,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardRowLeft: {
    flex: 1,
  },
  cardRowBrand: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardRowNumber: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 2,
  },
  cardRowNickname: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    marginTop: 4,
  },
  cardRowArrow: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 24,
    fontWeight: '300',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#1C1C1E',
  },
  addBtn: {
    width: '100%',
  },
  footerSecondary: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 32,
  },
  secondaryBtn: {
    padding: 8,
  },
  secondaryBtnText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '500',
  },
});
