import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '../src/components/AppBackground';
import { AppModal, ModalConfig } from '../src/components/AppModal';
import { PinInput } from '../src/components/PinInput';
import { changePin, verifyPin } from '../src/services/authService';
import { sharedStyles, theme } from '../src/theme';

type Step = 'current' | 'new' | 'confirm';

export default function ResetPinScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('current');
  const [currentPin, setCurrentPin] = useState('');
  const [nextPin, setNextPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [modal, setModal] = useState<ModalConfig | null>(null);

  const handleCurrentPin = async (pin: string) => {
    const isValid = await verifyPin(pin);

    if (!isValid) {
      setErrorMessage('That PIN is incorrect. Try again.');
      return;
    }

    setCurrentPin(pin);
    setErrorMessage('');
    setStep('new');
  };

  const handleNewPin = (pin: string) => {
    setNextPin(pin);
    setErrorMessage('');
    setStep('confirm');
  };

  const handleConfirmPin = async (pin: string) => {
    if (pin !== nextPin) {
      setErrorMessage('New PINs do not match. Start again.');
      setNextPin('');
      setStep('new');
      return;
    }

    try {
      await changePin(currentPin, pin);
      setModal({
        title: 'PIN Updated',
        message: 'Your vault PIN has been changed.',
        buttons: [{ label: 'Done', onPress: () => router.back() }],
      });
    } catch (err: any) {
      setModal({
        title: 'Could Not Update PIN',
        message: err.message ?? 'Try again.',
        buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
      });
    }
  };

  const title =
    step === 'current'
      ? 'Verify current PIN'
      : step === 'new'
        ? 'Choose a new PIN'
        : 'Confirm new PIN';

  const description =
    step === 'current'
      ? 'Enter your current 4-digit PIN before changing access settings.'
      : step === 'new'
        ? 'Pick a new PIN that is easy for you to remember but hard for others to guess.'
        : 'Re-enter the new PIN to confirm the change.';

  return (
    <>
    <AppBackground>
      <SafeAreaView style={sharedStyles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.hero}>
            <View style={styles.heroBadge}>
              <Feather name="key" size={22} color={theme.colors.primary} />
            </View>
            <Text style={styles.title} allowFontScaling={false}>{title}</Text>
            <Text style={styles.subtitle} allowFontScaling={false}>{description}</Text>
          </View>

          <View style={styles.progress}>
            {['Current', 'New', 'Confirm'].map((label, index) => {
              const stepIndex = step === 'current' ? 0 : step === 'new' ? 1 : 2;
              const active = index <= stepIndex;

              return (
                <View
                  key={label}
                  style={[styles.progressPill, active && styles.progressPillActive]}
                >
                  <Text
                    style={[
                      styles.progressLabel,
                      active && styles.progressLabelActive,
                    ]}
                    allowFontScaling={false}
                  >
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.pinCard}>
            <PinInput
              key={step}
              minLength={4}
              maxLength={4}
              label={step === 'current' ? 'Current PIN' : step === 'new' ? 'New PIN' : 'Confirm PIN'}
              onComplete={
                step === 'current'
                  ? handleCurrentPin
                  : step === 'new'
                    ? handleNewPin
                    : handleConfirmPin
              }
              errorMessage={errorMessage}
            />
          </View>

          <Text style={styles.note} allowFontScaling={false}>
            Biometric unlock settings stay the same after changing your PIN.
          </Text>
        </ScrollView>
      </SafeAreaView>

    </AppBackground>
    <AppModal config={modal} onDismiss={() => setModal(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 22,
  },
  hero: {
    alignItems: 'center',
    gap: 10,
  },
  heroBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 340,
  },
  progress: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  progressPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  progressPillActive: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.borderStrong,
  },
  progressLabel: {
    color: theme.colors.textSubtle,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  progressLabelActive: {
    color: theme.colors.primary,
  },
  pinCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 26,
    paddingHorizontal: 12,
  },
  note: {
    color: theme.colors.textSubtle,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
