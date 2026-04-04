import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '../src/components/AppBackground';
import { PinInput } from '../src/components/PinInput';
import { useAuth } from '../src/context/AuthContext';
import {
  authenticateWithBiometrics,
  clearPinLockout,
  getPinLockout,
  isBiometricsEnabled,
  recordPinFailure,
  verifyPin,
} from '../src/services/authService';
import { theme } from '../src/theme';

export default function UnlockScreen() {
  const router = useRouter();
  const { unlock } = useAuth();
  const { height: screenHeight } = useWindowDimensions();
  const isCompact = screenHeight < 700;
  const [errorMsg, setErrorMsg] = useState('');
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLocked = lockoutSeconds > 0;

  const startCountdown = useCallback((seconds: number) => {
    setLockoutSeconds(seconds);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          setErrorMsg('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const handleSuccess = useCallback(async () => {
    await clearPinLockout();
    unlock();
    router.replace('/home');
  }, [unlock, router]);

  const tryBiometrics = useCallback(async () => {
    const success = await authenticateWithBiometrics();
    if (success) {
      await handleSuccess();
    }
  }, [handleSuccess]);

  useEffect(() => {
    (async () => {
      // Check for an existing lockout before showing anything
      const lockout = await getPinLockout();
      setFailedAttempts(lockout.failedAttempts);
      if (lockout.locked) {
        startCountdown(lockout.secondsRemaining);
      }

      const enabled = await isBiometricsEnabled();
      setBiometricsEnabled(enabled);

      if (enabled && !lockout.locked) {
        await tryBiometrics();
      }
    })();
  }, [tryBiometrics, startCountdown]);

  const handlePinComplete = async (pin: string) => {
    setVerifying(true);
    // Yield to the JS event loop so React can render the spinner
    // before PBKDF2 blocks the thread.
    await new Promise((resolve) => setTimeout(resolve, 50));
    const valid = await verifyPin(pin);
    setVerifying(false);

    if (valid) {
      setErrorMsg('');
      await handleSuccess();
      return;
    }

    const status = await recordPinFailure();
    setFailedAttempts(status.failedAttempts);

    if (status.locked) {
      setErrorMsg('Too many attempts. Please wait.');
      startCountdown(status.secondsRemaining);
    } else {
      const remaining = Math.max(0, 5 - status.failedAttempts);
      if (remaining > 0) {
        setErrorMsg(`Incorrect PIN. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
      } else {
        setErrorMsg('Incorrect PIN. Try again.');
      }
    }
  };

  const lockoutMessage = isLocked
    ? 'Too many failed attempts.\nPlease wait before trying again.'
    : null;

  return (
    <AppBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={[styles.container, isCompact && styles.containerCompact]}>
          <View style={[styles.hero, isCompact && styles.heroCompact]}>
            <View style={[styles.heroBadge, isCompact && styles.heroBadgeCompact]}>
              <Feather name="shield" size={isCompact ? 20 : 24} color={theme.colors.primary} />
            </View>
            <Text style={[styles.title, isCompact && styles.titleCompact]} allowFontScaling={false}>Welcome back</Text>
          </View>

          <View style={[styles.pinCard, isLocked && styles.pinCardLocked, isCompact && styles.pinCardCompact]}>
            {verifying ? (
              <View style={styles.verifyingContainer}>
                <ActivityIndicator color={theme.colors.primary} size="large" />
                <Text style={styles.verifyingText} allowFontScaling={false}>Verifying…</Text>
              </View>
            ) : isLocked ? (
              <View style={styles.lockoutContainer}>
                <Feather name="lock" size={28} color={theme.colors.warning} />
                <Text style={styles.lockoutTitle} allowFontScaling={false}>Vault Locked</Text>
                <Text style={styles.lockoutMessage} allowFontScaling={false}>{lockoutMessage}</Text>
                <Text style={styles.lockoutCountdown} allowFontScaling={false}>{lockoutSeconds}s</Text>
                {failedAttempts >= 10 && (
                  <Text style={styles.lockoutHint} allowFontScaling={false}>
                    If you have forgotten your PIN, you will need to reinstall the app to reset it.
                  </Text>
                )}
              </View>
            ) : (
              <PinInput
                minLength={4}
                maxLength={4}
                label="Enter PIN"
                onComplete={handlePinComplete}
                errorMessage={errorMsg}
              />
            )}
          </View>

          {biometricsEnabled && !isLocked ? (
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={tryBiometrics}
              activeOpacity={0.82}
            >
              <Feather name="shield" size={16} color={theme.colors.primary} />
              <Text style={styles.biometricText} allowFontScaling={false}>Use biometrics instead</Text>
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
  containerCompact: {
    paddingVertical: 20,
    gap: 14,
  },
  hero: {
    alignItems: 'center',
    gap: 10,
  },
  heroCompact: {
    gap: 6,
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
  heroBadgeCompact: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 22,
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
  pinCardCompact: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 22,
  },
  pinCardLocked: {
    borderColor: theme.colors.warning,
  },
  verifyingContainer: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 28,
  },
  verifyingText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  lockoutContainer: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  lockoutTitle: {
    color: theme.colors.warning,
    fontSize: 18,
    fontWeight: '700',
  },
  lockoutMessage: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  lockoutCountdown: {
    color: theme.colors.text,
    fontSize: 36,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  lockoutHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
    paddingHorizontal: 8,
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
