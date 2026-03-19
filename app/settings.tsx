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
import { clearAllCards, getCardCount } from '../src/storage/database';
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
        message: 'This device does not have biometrics set up.',
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

  const handlePurgeVault = () => {
    setModal({
      title: 'Purge Vault',
      message: `This will permanently delete all ${cardCount} card${cardCount !== 1 ? 's' : ''} stored in the vault. This action cannot be undone.`,
      buttons: [
        {
          label: 'Continue',
          variant: 'danger',
          onPress: () => {
            setModal({
              title: 'Are you absolutely sure?',
              message: 'All your card data will be wiped immediately and cannot be recovered. The vault will lock after purging.',
              buttons: [
                {
                  label: 'Yes, purge everything',
                  variant: 'danger',
                  onPress: async () => {
                    await clearAllCards();
                    lock();
                    router.replace('/unlock');
                  },
                },
                { label: 'Cancel', variant: 'ghost', onPress: () => {} },
              ],
            });
          },
        },
        { label: 'Cancel', variant: 'ghost', onPress: () => {} },
      ],
    });
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
                    ? 'Use biometrics for faster unlock.'
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
              noBorder
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
              noBorder
            />
          </View>

          <SectionTitle title="Privacy" />
          <View style={styles.section}>
            <SettingRow
              icon="shield"
              title="Security & Privacy"
              subtitle="See how encryption, storage, and clipboard protection work."
              onPress={() => router.push('/security')}
              noBorder
            />
          </View>

          <SectionTitle title="Danger Zone" />
          <TouchableOpacity
            style={styles.dangerSection}
            onPress={handlePurgeVault}
            activeOpacity={0.78}
          >
            <View style={styles.dangerIconWrap}>
              <Feather name="trash-2" size={18} color={theme.colors.danger} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.dangerTitle}>Purge Vault</Text>
              <Text style={styles.dangerSubtitle}>
                Permanently delete all cards. This cannot be undone.
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.danger} style={{ opacity: 0.6 }} />
          </TouchableOpacity>

          <View style={styles.footerNote}>
            <Feather name="clock" size={16} color={theme.colors.textSubtle} />
            <Text style={styles.footerNoteText}>
              The vault auto-locks after 30 seconds in the background.
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
  noBorder,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  subtitle: string;
  onPress: () => void;
  noBorder?: boolean;
}) {
  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={[styles.row, noBorder && styles.rowNoBorder]}>
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
  rowNoBorder: {
    borderBottomWidth: 0,
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
  dangerSection: {
    backgroundColor: 'rgba(232, 112, 112, 0.06)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(232, 112, 112, 0.28)',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dangerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(232, 112, 112, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerTitle: {
    color: theme.colors.danger,
    fontSize: 15,
    fontWeight: '600',
  },
  dangerSubtitle: {
    color: 'rgba(232, 112, 112, 0.7)',
    fontSize: 13,
    lineHeight: 18,
  },
  footerNote: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingTop: 8,
  },
  footerNoteText: {
    flex: 1,
    color: theme.colors.textSubtle,
    fontSize: 12,
    lineHeight: 18,
  },
});
