import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '../src/components/AppBackground';
import { PinInput } from '../src/components/PinInput';
import { useAuth } from '../src/context/AuthContext';
import {
  authenticateWithBiometrics,
  isBiometricsEnabled,
  verifyPin,
} from '../src/services/authService';
import { theme } from '../src/theme';

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
    if (success) {
      handleSuccess();
    }
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
      return;
    }

    setErrorMsg('Incorrect PIN. Try again.');
  };

  return (
    <AppBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.hero}>
            <View style={styles.heroBadge}>
              <Feather name="shield" size={24} color={theme.colors.primary} />
            </View>
            <Text style={styles.title}>Welcome back</Text>
          </View>

          <View style={styles.pinCard}>
            <PinInput
              minLength={4}
              maxLength={4}
              label="Enter PIN"
              onComplete={handlePinComplete}
              errorMessage={errorMsg}
            />
          </View>

          {biometricsEnabled ? (
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={tryBiometrics}
              activeOpacity={0.82}
            >
              <Feather name="shield" size={16} color={theme.colors.primary} />
              <Text style={styles.biometricText}>Use biometrics instead</Text>
            </TouchableOpacity>
          ) : null}
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
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  infoPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoPillText: {
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
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  biometricText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
