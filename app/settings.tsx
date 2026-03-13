import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '../src/components/AppBackground';
import { AppModal, ModalConfig } from '../src/components/AppModal';
import { useAuth } from '../src/context/AuthContext';
import {
  getBiometricType,
  isBiometricsAvailable,
  isBiometricsEnabled,
  setBiometricsEnabled as persistBiometricsEnabled,
} from '../src/services/authService';
import { getCardCount } from '../src/storage/database';
import { sharedStyles, theme } from '../src/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { lock } = useAuth();

  const [cardCount, setCardCount] = useState(0);
  const [biometricsAvailable, setBiometricsAvailableState] = useState(false);
  const [biometricsEnabled, setBiometricsEnabledState] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometrics');
  const [updatingBiometrics, setUpdatingBiometrics] = useState(false);
  const [modal, setModal] = useState<ModalConfig | null>(null);

  const loadSettings = useCallback(async () => {
    const [totalCards, available, enabled] = await Promise.all([
      getCardCount(),
      isBiometricsAvailable(),
      isBiometricsEnabled(),
    ]);

    setCardCount(totalCards);
    setBiometricsAvailableState(available);
    setBiometricsEnabledState(enabled);
    setBiometricLabel(available ? await getBiometricType() : 'Biometrics');
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings]),
  );

  const handleToggleBiometrics = async (value: boolean) => {
    if (!biometricsAvailable) {
      setModal({
        title: 'Biometrics Unavailable',
        message: 'This device does not have Face ID or fingerprint unlock set up.',
        buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
      });
      return;
    }

    setUpdatingBiometrics(true);
    setBiometricsEnabledState(value);

    try {
      await persistBiometricsEnabled(value);
    } catch (err: any) {
      setBiometricsEnabledState(!value);
      setModal({
        title: 'Could Not Update Setting',
        message: err.message ?? 'Try again.',
        buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
      });
    } finally {
      setUpdatingBiometrics(false);
    }
  };

  const handleLockNow = () => {
    lock();
    router.replace('/unlock');
  };

  return (
    <AppBackground>
      <SafeAreaView style={sharedStyles.safeArea} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <SectionTitle title="Access" />
          <View style={styles.section}>
            <View style={styles.row}>
              <View style={styles.rowIconWrap}>
                <Feather name="shield" size={18} color={theme.colors.primary} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{biometricLabel}</Text>
                <Text style={styles.rowSubtitle}>
                  {biometricsAvailable
                    ? 'Use device biometrics for faster unlock.'
                    : 'Not available on this device yet.'}
                </Text>
              </View>
              <Switch
                value={biometricsEnabled}
                onValueChange={handleToggleBiometrics}
                disabled={!biometricsAvailable || updatingBiometrics}
                trackColor={{
                  false: 'rgba(154,169,183,0.25)',
                  true: 'rgba(235,235,235,0.30)',
                }}
                thumbColor={
                  biometricsEnabled ? theme.colors.primary : theme.colors.textMuted
                }
              />
            </View>

            <SettingRow
              icon="key"
              title="Reset PIN"
              subtitle="Change the PIN that protects this vault."
              onPress={() => router.push('/reset-pin')}
            />

            <SettingRow
              icon="lock"
              title="Lock Now"
              subtitle="Immediately return the app to the unlock screen."
              onPress={handleLockNow}
            />
          </View>

          <SectionTitle title="Backup & Transfer" />
          <View style={styles.section}>
            <SettingRow
              icon="upload"
              title="Export Backup"
              subtitle="Create a password-protected .securevault file."
              onPress={() => router.push('/export')}
            />
            <SettingRow
              icon="download"
              title="Import Backup"
              subtitle="Restore cards from a previously exported vault."
              onPress={() => router.push('/import')}
            />
          </View>

          <SectionTitle title="Privacy" />
          <View style={styles.section}>
            <SettingRow
              icon="shield"
              title="Security & Privacy"
              subtitle="See how encryption, storage, and clipboard protection work."
              onPress={() => router.push('/security')}
            />
          </View>

          <View style={styles.footerNote}>
            <Feather name="moon" size={16} color={theme.colors.textSubtle} />
            <Text style={styles.footerNoteText}>
              The vault auto-locks after 30 seconds in the background. All card
              data stays on this device.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      <AppModal config={modal} onDismiss={() => setModal(null)} />
    </AppBackground>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function SettingRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={styles.row}>
      <View style={styles.rowIconWrap}>
        <Feather name={icon} size={18} color={theme.colors.primary} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={theme.colors.textSubtle} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    gap: 14,
  },
  heroCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    padding: 20,
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { flex: 1, gap: 4 },
  heroEyebrow: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  heroText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  statsPill: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: theme.colors.backgroundAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statsValue: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  statsLabel: {
    color: theme.colors.textSubtle,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    color: theme.colors.textSubtle,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  footerNote: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    paddingTop: 8,
  },
  footerNoteText: {
    flex: 1,
    color: theme.colors.textSubtle,
    fontSize: 12,
    lineHeight: 18,
  },
});
