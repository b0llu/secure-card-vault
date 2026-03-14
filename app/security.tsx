import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '../src/components/AppBackground';
import { theme } from '../src/theme';

const SECURITY_POINTS = [
  {
    icon: '🔐',
    title: 'Your cards are encrypted',
    body: 'Every card is scrambled using the same encryption standard trusted by banks and governments before it is saved to your phone. Anyone who somehow got to your data would see nothing but meaningless gibberish.',
  },
  {
    icon: '🔑',
    title: 'The key is locked to your device',
    body: 'The key that unlocks your cards is stored in a protected area of your phone that other apps cannot reach. It is tied to this device only — it cannot be copied off or used anywhere else.',
  },
  {
    icon: '📴',
    title: 'No internet, ever',
    body: 'This app never connects to the internet. No syncing, no analytics, no ads, nothing. Your cards never travel over a network, so there is nothing to intercept and no server that could be hacked.',
  },
  {
    icon: '🙈',
    title: 'Only you can access your vault',
    body: 'There is no account and no recovery service — not even we can get into your vault. This also means there is no "Forgot PIN" option. Keep your PIN and backup password safe, because nobody can recover them for you.',
  },
  {
    icon: '🧬',
    title: 'PIN & biometric lock',
    body: 'Your vault is locked with a PIN you choose, and optionally your fingerprint or Face ID. If you switch apps or put your phone down, the vault locks itself automatically after 30 seconds.',
  },
  {
    icon: '👁️',
    title: 'Sensitive details hide themselves',
    body: 'Card numbers and CVVs are hidden by default. If you reveal one, it disappears again after 5 seconds. If you copy one, it is automatically removed from your clipboard after 20 seconds so nothing lingers.',
  },
  {
    icon: '🖼️',
    title: 'Screenshots are blocked',
    body: 'Taking a screenshot or recording your screen while the app is open is blocked at the system level on both iPhone and Android. Your cards will not appear in the recent apps screen either.',
  },
  {
    icon: '📷',
    title: 'Card scanning stays on your phone',
    body: 'When you scan a card with your camera, the reading happens entirely on your device. No photo or card detail is sent anywhere — not to us, not to any third party.',
  },
  {
    icon: '💾',
    title: 'Backups are encrypted too',
    body: 'When you export a backup, it is locked with a password you set. The file is fully encrypted before it leaves the app, so even if someone gets hold of the file, they cannot open it without your password.',
  },
];

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
            <Text style={styles.eyebrow}>How we protect you</Text>
            <Text style={styles.title}>Your cards, locked tight.</Text>
            <Text style={styles.subtitle}>
              No internet. No servers. No accounts. Just your cards, on your phone, protected by the same encryption used by banks.
            </Text>
          </View>

          {SECURITY_POINTS.map((point) => (
            <View key={point.title} style={styles.pointCard}>
              <View style={styles.pointIconWrap}>
                <Text style={styles.pointIcon}>{point.icon}</Text>
              </View>
              <View style={styles.pointCopy}>
                <Text style={styles.pointTitle}>{point.title}</Text>
                <Text style={styles.pointBody}>{point.body}</Text>
              </View>
            </View>
          ))}
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
    padding: 20,
    paddingBottom: 40,
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
  pointCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  pointIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointIcon: {
    fontSize: 20,
  },
  pointCopy: {
    flex: 1,
    gap: 4,
  },
  pointTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  pointBody: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
});
