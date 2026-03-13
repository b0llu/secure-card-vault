/**
 * unlock.tsx
 *
 * Unlock screen — shown on every app open after setup.
 *
 * Flow:
 *  1. If biometrics enabled → auto-prompt on mount.
 *  2. On biometric failure → fall back to PIN.
 *  3. Correct PIN → unlock context → navigate to /home.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PinInput } from '../src/components/PinInput';
import {
  verifyPin,
  isBiometricsEnabled,
  authenticateWithBiometrics,
} from '../src/services/authService';
import { useAuth } from '../src/context/AuthContext';

export default function UnlockScreen() {
  const router = useRouter();
  const { unlock } = useAuth();
  const [errorMsg, setErrorMsg] = useState('');
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  const handleSuccess = useCallback(() => {
    unlock();
    router.replace('/home');
  }, [unlock, router]);

  const tryBiometrics = useCallback(async () => {
    const success = await authenticateWithBiometrics();
    if (success) handleSuccess();
  }, [handleSuccess]);

  useEffect(() => {
    (async () => {
      const enabled = await isBiometricsEnabled();
      setBiometricsEnabled(enabled);

      if (enabled) {
        await tryBiometrics();
      }
    })();
  }, [tryBiometrics]);

  const handlePinComplete = async (pin: string) => {
    const valid = await verifyPin(pin);
    if (valid) {
      setErrorMsg('');
      handleSuccess();
    } else {
      setErrorMsg('Incorrect PIN. Try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔐</Text>
        </View>

        <Text style={styles.title}>Card Vault</Text>
        <Text style={styles.subtitle}>Enter your PIN to unlock</Text>

        <PinInput
          minLength={4}
          maxLength={4}
          label="Enter PIN"
          onComplete={handlePinComplete}
          errorMessage={errorMsg}
        />

        {biometricsEnabled && (
          <TouchableOpacity
            style={styles.biometricButton}
            onPress={tryBiometrics}
          >
            <Text style={styles.biometricText}>
              Use Biometrics instead
            </Text>
          </TouchableOpacity>
        )}
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
  },
  biometricButton: {
    marginTop: 32,
    padding: 12,
  },
  biometricText: {
    color: '#00C896',
    fontSize: 15,
    fontWeight: '600',
  },
});
