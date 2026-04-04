import React, { useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '../src/components/AppBackground';
import { theme } from '../src/theme';

const SECURITY_POINTS = [
  {
    icon: '🔐',
    title: 'Your cards are encrypted',
    tagline: 'AES-256 — the same standard trusted by banks and governments.',
    body: 'Every card is scrambled using the same encryption standard trusted by banks and governments before it is saved to your phone. Anyone who somehow got to your data would see nothing but meaningless gibberish.',
    expandedHeight: 100,
  },
  {
    icon: '🔑',
    title: 'The key is locked to your device',
    tagline: 'Stored in your phone\'s secure enclave — unreachable by any other app.',
    body: 'The key that unlocks your cards is stored in a protected area of your phone that other apps cannot reach. It is tied to this device only — it cannot be copied off or used anywhere else.',
    expandedHeight: 80,
  },
  {
    icon: '📴',
    title: 'No internet, ever',
    tagline: 'Fully offline — nothing leaves your device, ever.',
    body: 'This app never connects to the internet. No syncing, no analytics, no ads, nothing. Your cards never travel over a network, so there is nothing to intercept and no server that could be hacked.',
    expandedHeight: 80,
  },
  {
    icon: '🙈',
    title: 'Only you can access your vault',
    tagline: 'No accounts, no recovery service, no backdoors.',
    body: 'There is no account and no recovery service — not even we can get into your vault. This also means there is no "Forgot PIN" option. Keep your PIN and backup password safe, because nobody can recover them for you.',
    expandedHeight: 100,
  },
  {
    icon: '🧬',
    title: 'PIN & biometric lock',
    tagline: 'Auto-locks after 30 seconds of inactivity.',
    body: 'Your vault is locked with a PIN you choose, and optionally biometrics (Face ID or fingerprint). If you switch apps or put your phone down, the vault locks itself automatically after 30 seconds.',
    expandedHeight: 80,
  },
  {
    icon: '👁️',
    title: 'Sensitive details hide themselves',
    tagline: 'Auto-hides in 5 seconds, clears clipboard in 20.',
    body: 'Card numbers and CVVs are hidden by default. If you reveal one, it disappears again after 5 seconds. If you copy one, it is automatically removed from your clipboard after 20 seconds so nothing lingers.',
    expandedHeight: 80,
  },
  {
    icon: '🖼️',
    title: 'Screenshots are blocked',
    tagline: 'System-level screen capture prevention on both platforms.',
    body: 'Taking a screenshot or recording your screen while the app is open is blocked at the system level on both iPhone and Android. Your cards will not appear in the recent apps screen either.',
    expandedHeight: 80,
  },
  {
    icon: '📷',
    title: 'Card scanning stays on your phone',
    tagline: 'On-device OCR — your camera feed never leaves the app.',
    body: 'When you scan a card with your camera, the reading happens entirely on your device. No photo or card detail is sent anywhere — not to us, not to any third party.',
    expandedHeight: 80,
  },
  {
    icon: '💾',
    title: 'Backups are encrypted too',
    tagline: 'Password-locked, fully encrypted before it leaves the app.',
    body: 'When you export a backup, it is locked with a password you set. The file is fully encrypted before it leaves the app, so even if someone gets hold of the file, they cannot open it without your password.',
    expandedHeight: 80,
  },
];

function AccordionItem({ point, isLast }: { point: (typeof SECURITY_POINTS)[0]; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const animHeight = useRef(new Animated.Value(0)).current;
  const animOpacity = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const opening = !expanded;
    setExpanded(opening);

    Animated.parallel([
      Animated.timing(animHeight, {
        toValue: opening ? point.expandedHeight : 0,
        duration: 300,
        easing: opening ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(animOpacity, {
        toValue: opening ? 1 : 0,
        duration: 280,
        easing: opening ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(rotation, {
        toValue: opening ? 1 : 0,
        duration: 280,
        easing: opening ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const chevronRotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Pressable
      onPress={toggle}
      style={({ pressed }) => [styles.item, isLast && styles.itemLast, pressed && styles.itemPressed]}
    >
      <View style={styles.itemHeader}>
        <View style={styles.itemLeft}>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>{point.icon}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.itemTitle} allowFontScaling={false}>{point.title}</Text>
            <Animated.View style={{
              height: animOpacity.interpolate({ inputRange: [0, 1], outputRange: [17, 0] }),
              opacity: animOpacity.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 0, 0] }),
              overflow: 'hidden',
            }}>
              <Text style={styles.tagline} numberOfLines={1} allowFontScaling={false}>{point.tagline}</Text>
            </Animated.View>
          </View>
        </View>
        <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
          <Feather name="chevron-down" size={16} color={theme.colors.textSubtle} />
        </Animated.View>
      </View>

      <Animated.View style={{ height: animHeight, overflow: 'hidden', opacity: animOpacity }}>
        <View style={styles.bodyWrap}>
          <Text style={styles.body} allowFontScaling={false}>{point.body}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export default function SecurityScreen() {
  return (
    <AppBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroBadge}>
              <Feather name="shield" size={26} color={theme.colors.primary} />
            </View>
            <Text style={styles.eyebrow} allowFontScaling={false}>How we protect you</Text>
            <Text style={styles.title} allowFontScaling={false}>Your cards, locked tight.</Text>
            <Text style={styles.subtitle} allowFontScaling={false}>
              No internet. No servers. No accounts. Just your cards, on your phone, protected by the same encryption used by banks.
            </Text>
          </View>

          <View style={styles.accordion}>
            {SECURITY_POINTS.map((point, index) => (
              <AccordionItem key={point.title} isLast={index === SECURITY_POINTS.length - 1} point={point} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    padding: 10,
    paddingBottom: 20,
    gap: 14,
  },
  hero: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  heroBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 330,
  },
  accordion: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
  },
  item: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  itemLast: {
    borderBottomWidth: 0,
  },
  itemPressed: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: {
    fontSize: 18,
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  itemTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  tagline: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  bodyWrap: {
    gap: 12,
  },
  body: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    paddingLeft: 52,
  },
});
