/**
 * setup-pin.tsx
 *
 * First-launch screen where the user creates their vault PIN.
 * Two-step: enter PIN → confirm PIN.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PinInput } from '../src/components/PinInput';
import { setupPin, isBiometricsAvailable, setBiometricsEnabled } from '../src/services/authService';
import { ThemedButton } from '../src/components/ThemedButton';
import { useAuth } from '../src/context/AuthContext';

type Step = 'create' | 'confirm' | 'biometrics';

export default function SetupPinScreen() {
  const { unlock, refreshPinExists } = useAuth();
  const [step, setStep] = useState<Step>('create');
  const [firstPin, setFirstPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  const handleCreate = async (pin: string) => {
    setFirstPin(pin);
    setStep('confirm');
    setErrorMsg('');
  };

  const handleConfirm = async (pin: string) => {
    if (pin !== firstPin) {
      setErrorMsg('PINs do not match. Try again.');
      setStep('create');
      setFirstPin('');
      return;
    }

    try {
      await setupPin(pin);
      await refreshPinExists();

      const available = await isBiometricsAvailable();
      setBiometricsAvailable(available);

      if (available) {
        setStep('biometrics');
      } else {
        unlock();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleEnableBiometrics = async (enable: boolean) => {
    await setBiometricsEnabled(enable);
    unlock();
  };

  if (step === 'biometrics') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔐</Text>
          </View>
          <Text style={styles.title}>Enable Biometrics?</Text>
          <Text style={styles.subtitle}>
            You can unlock the vault faster using Face ID or your fingerprint.
          </Text>
          <View style={styles.biometricButtons}>
            <ThemedButton
              title="Enable Biometrics"
              onPress={() => handleEnableBiometrics(true)}
              style={styles.button}
            />
            <ThemedButton
              title="Skip, use PIN only"
              variant="ghost"
              onPress={() => handleEnableBiometrics(false)}
              style={styles.button}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔒</Text>
        </View>

        <Text style={styles.title}>Secure Card Vault</Text>
        <Text style={styles.subtitle}>
          {step === 'create'
            ? 'Create a 4-digit PIN to protect your vault.'
            : 'Re-enter your PIN to confirm.'}
        </Text>

        <PinInput
          key={step}
          minLength={4}
          maxLength={4}
          label={step === 'create' ? 'Create PIN' : 'Confirm PIN'}
          onComplete={step === 'create' ? handleCreate : handleConfirm}
          errorMessage={errorMsg}
        />
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
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#8E8E93',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
    maxWidth: 300,
  },
  biometricButtons: {
    width: '100%',
    marginTop: 32,
    gap: 12,
  },
  button: {
    width: '100%',
  },
});
