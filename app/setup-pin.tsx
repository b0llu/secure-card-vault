import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '../src/components/AppBackground';
import { AppModal, ModalConfig } from '../src/components/AppModal';
import { PinInput } from '../src/components/PinInput';
import { ThemedButton } from '../src/components/ThemedButton';
import { useAuth } from '../src/context/AuthContext';
import {
  isBiometricsAvailable,
  setBiometricsEnabled,
  setupPin,
} from '../src/services/authService';
import { theme } from '../src/theme';

type Step = 'create' | 'confirm' | 'biometrics';

export default function SetupPinScreen() {
  const { unlock, refreshPinExists } = useAuth();
  const [step, setStep] = useState<Step>('create');
  const [firstPin, setFirstPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<ModalConfig | null>(null);

  const handleCreate = async (pin: string) => {
    setFirstPin(pin);
    setErrorMsg('');
    setStep('confirm');
  };

  const handleConfirm = async (pin: string) => {
    if (pin !== firstPin) {
      setErrorMsg('PINs do not match. Start again.');
      setFirstPin('');
      setStep('create');
      return;
    }

    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      await setupPin(pin);
      await refreshPinExists();

      if (await isBiometricsAvailable()) {
        setStep('biometrics');
      } else {
        unlock();
      }
    } catch (err: any) {
      setModal({
        title: 'Error',
        message: err.message,
        buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEnableBiometrics = async (enable: boolean) => {
    await setBiometricsEnabled(enable);
    unlock();
  };

  if (step === 'biometrics') {
    return (
      <AppBackground>
        <SafeAreaView style={styles.safe}>
          <ScrollView contentContainerStyle={styles.container}>
            <Hero
              icon="shield"
              eyebrow="Faster unlock"
              title="Enable Biometrics?"
              subtitle="Use biometrics to open the vault without typing your PIN each time."
            />

            <View style={styles.actions}>
              <ThemedButton
                title="Enable Biometrics"
                onPress={() => handleEnableBiometrics(true)}
                style={styles.button}
                icon={
                  <Feather name="shield" size={18} color={theme.colors.primaryInk} />
                }
              />
              <ThemedButton
                title="Use PIN Only"
                variant="ghost"
                onPress={() => handleEnableBiometrics(false)}
                style={styles.button}
              />
            </View>
          </ScrollView>
        </SafeAreaView>

        <AppModal config={modal} onDismiss={() => setModal(null)} />
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <Hero
            icon="lock"
            eyebrow="Secure setup"
            title="Protect your vault"
            subtitle={
              step === 'create'
                ? 'Create a 4-digit PIN to unlock your cards.'
                : 'Re-enter the PIN once to confirm it.'
            }
          />

          <View style={styles.pinCard}>
            {saving ? (
              <View style={styles.savingContainer}>
                <ActivityIndicator color={theme.colors.primary} size="large" />
                <Text style={styles.savingText}>Setting up vault…</Text>
              </View>
            ) : (
              <PinInput
                key={step}
                minLength={4}
                maxLength={4}
                label={step === 'create' ? 'Create PIN' : 'Confirm PIN'}
                onComplete={step === 'create' ? handleCreate : handleConfirm}
                errorMessage={errorMsg}
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <AppModal config={modal} onDismiss={() => setModal(null)} />
    </AppBackground>
  );
}

function Hero({
  icon,
  eyebrow,
  title,
  subtitle,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroBadge}>
        <Feather name={icon} size={24} color={theme.colors.primary} />
      </View>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 22,
  },
  hero: {
    alignItems: 'center',
    gap: 10,
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
  detailCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  featurePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  featurePillText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  pinCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.colors.surface,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 28,
    paddingHorizontal: 18,
  },
  savingContainer: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 28,
  },
  savingText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    width: '100%',
    maxWidth: 420,
    gap: 12,
  },
  button: {
    width: '100%',
  },
});
