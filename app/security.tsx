/**
 * security.tsx
 *
 * Security & Privacy transparency screen.
 *
 * Clearly explains to users how their data is protected in plain language.
 * This screen builds trust and demonstrates our security commitments.
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SECURITY_POINTS = [
  {
    icon: '🔐',
    title: 'AES-256 Encryption',
    body: 'Every card you save is encrypted using AES-256-CBC — the same standard used by banks and governments worldwide. Your card data is encrypted before it is written to storage.',
  },
  {
    icon: '🔑',
    title: 'Hardware-Backed Key Storage',
    body: 'Your encryption key is stored in the device\'s secure hardware (Android Keystore / iOS Secure Enclave). Even if someone extracts the app database, they cannot read the data without the hardware key.',
  },
  {
    icon: '📴',
    title: 'Fully Offline',
    body: 'The app works completely offline. There are no network requests, no analytics, no background sync. Your data never leaves your device under any circumstances.',
  },
  {
    icon: '🚫',
    title: 'No Servers, No Cloud',
    body: 'We do not operate any servers that store card data. There is no backend, no database in the cloud, and no third-party services with access to your information.',
  },
  {
    icon: '🙈',
    title: 'Zero Knowledge',
    body: 'Even the developer of this app cannot access your card data. The encryption key exists only on your device. We have no backdoor, no recovery key, and no way to view your information.',
  },
  {
    icon: '🧬',
    title: 'Biometric & PIN Protection',
    body: 'Your vault is locked behind your device biometrics (Face ID / Fingerprint) and/or a PIN. The vault auto-locks after 30 seconds in the background.',
  },
  {
    icon: '📋',
    title: 'Clipboard Auto-Clear',
    body: 'When you copy a card number, it is automatically cleared from your clipboard after 20 seconds to prevent accidental exposure.',
  },
  {
    icon: '🖼',
    title: 'Screenshot Protection',
    body: 'On Android, the app sets FLAG_SECURE to prevent screenshots and screen recordings, protecting your card data from screen capture tools.',
  },
  {
    icon: '💾',
    title: 'Secure Backup',
    body: 'When you export your vault, it is re-encrypted with a password you choose using PBKDF2 key derivation. Your master device key is never included in the export file.',
  },
];

export default function SecurityScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>🛡</Text>
          <Text style={styles.heroTitle}>Your Security</Text>
          <Text style={styles.heroSubtitle}>
            Card Vault was built from the ground up with your privacy
            as the top priority. Here is exactly how your data is protected.
          </Text>
        </View>

        {/* Security points */}
        {SECURITY_POINTS.map((point, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.cardIcon}>{point.icon}</Text>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{point.title}</Text>
              <Text style={styles.cardBody}>{point.body}</Text>
            </View>
          </View>
        ))}

        {/* Bottom note */}
        <Text style={styles.bottomNote}>
          Card Vault is a local-only app. Your cards are yours alone.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0E0E0E',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
  },
  heroIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 12,
  },
  heroSubtitle: {
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 320,
  },
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  cardIcon: {
    fontSize: 24,
    marginTop: 1,
    width: 30,
    textAlign: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 5,
  },
  cardBody: {
    color: '#8E8E93',
    fontSize: 13,
    lineHeight: 20,
  },
  bottomNote: {
    color: '#555558',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
