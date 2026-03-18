import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';

import { AppBackground } from '../src/components/AppBackground';
import { AppModal, ModalConfig } from '../src/components/AppModal';
import { ThemedButton } from '../src/components/ThemedButton';
import {
  exportVault,
  saveVaultCopyToAndroidDirectory,
} from '../src/services/exportService';
import { theme } from '../src/theme';

export default function ExportScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [savedFilename, setSavedFilename] = useState<string | null>(null);
  const [savedLocation, setSavedLocation] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalConfig | null>(null);

  const handleExport = async () => {
    if (password.length < 10) {
      setModal({
        title: 'Weak Password',
        message: 'Export password must be at least 10 characters.',
        buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
      });
      return;
    }
    if (password !== confirmPassword) {
      setModal({
        title: 'Password Mismatch',
        message: 'Passwords do not match.',
        buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
      });
      return;
    }

    setExporting(true);
    try {
      const localExport = await exportVault(password);
      let visibleExport = localExport;

      if (Platform.OS === 'android') {
        try {
          visibleExport = await saveVaultCopyToAndroidDirectory(
            localExport.filePath,
            localExport.filename,
          );
        } catch (err: any) {
          visibleExport = localExport;
          setModal({
            title: 'Backup Saved Internally',
            message: err?.message === 'Folder access was not granted.'
              ? 'The backup was saved inside the app. Use "Share / Move File" to place it in Downloads or another visible folder.'
              : 'The backup was created, but it could not be copied to a visible folder. Use "Share / Move File" to place it in Downloads or another folder.',
            buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
          });
        }
      }

      setSavedPath(localExport.filePath);
      setSavedFilename(visibleExport.filename);
      setSavedLocation(visibleExport.locationDescription);
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setModal({
        title: 'Export Failed',
        message: err.message ?? 'An unexpected error occurred.',
        buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
      });
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (!savedPath) return;
    try {
      await Sharing.shareAsync(savedPath, {
        mimeType: 'application/octet-stream',
        dialogTitle: 'Save Secure Vault Backup',
        UTI: 'public.data',
      });
    } catch {
      setModal({
        title: 'Share Failed',
        message: 'Could not open the share sheet.',
        buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
      });
    }
  };

  return (
    <AppBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.stepsCard}>
              <StepRow icon="lock" text="Set a password only you'll know" />
              <StepRow icon="shield" text="Cards are re-encrypted before leaving the app" />
              <StepRow icon="save" text="Backup file saved to your device, ready to share" />
            </View>

            <View style={styles.formCard}>
              <FieldLabel label="Export password — minimum 10 characters" />
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.inputNoBorder]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 10 characters"
                  placeholderTextColor={theme.colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.showHideButton}
                >
                  <Text style={styles.showHideText}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>

              {password.length > 0 && password.length < 10 && (
                <Text style={styles.passwordHint}>
                  {10 - password.length} more character{10 - password.length === 1 ? '' : 's'} needed
                </Text>
              )}

              <FieldLabel label="Confirm password" />
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.inputNoBorder]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter password"
                  placeholderTextColor={theme.colors.textMuted}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword((v) => !v)}
                  style={styles.showHideButton}
                >
                  <Text style={styles.showHideText}>
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>

              {password.length > 0 ? <PasswordStrength password={password} /> : null}
            </View>

            {savedPath ? (
              <View style={styles.successCard}>
                <View style={styles.successIcon}>
                  <Feather name="check" size={20} color={theme.colors.success} />
                </View>
                <View style={styles.successCopy}>
                  <Text style={styles.successTitle}>Backup saved</Text>
                  <Text style={styles.successFilename} numberOfLines={1}>{savedFilename}</Text>
                  <Text style={styles.successHint}>
                    {Platform.OS === 'ios'
                      ? 'Find it in Files app > On My iPhone > Card Vault > backups'
                      : 'Use the button below to move it to Downloads or another folder.'}
                  </Text>
                </View>
              </View>
            ) : null}

            {savedPath ? (
              <ThemedButton
                title="Share / Move File"
                onPress={handleShare}
                variant="secondary"
                icon={<Feather name="share" size={18} color={theme.colors.text} />}
              />
            ) : (
              <ThemedButton
                title="Export Backup"
                onPress={handleExport}
                loading={exporting}
                disabled={password.length < 10 || password !== confirmPassword}
                icon={
                  <Feather name="upload" size={18} color={theme.colors.primaryInk} />
                }
              />
            )}

            <View style={styles.warningCard}>
              <Feather style={{marginTop: 3}} name="alert-triangle" size={16} color={theme.colors.warning} />
              <Text style={styles.warningText}>
                If you forget this export password, the backup cannot be restored.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <AppModal config={modal} onDismiss={() => setModal(null)} />

      {/* Exporting overlay — rendered as last child of AppBackground so it
          sits above all content without Modal positioning issues */}
      {exporting && (
        <View style={[StyleSheet.absoluteFill, styles.exportingOverlay]}>
          <View style={styles.exportingCard}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text style={styles.exportingTitle}>Encrypting your vault…</Text>
            <Text style={styles.exportingSubtitle}>
              This may take a few seconds.{'\n'}Please don't close the app.
            </Text>
          </View>
        </View>
      )}
    </AppBackground>
  );
}

function StepRow({ icon, text }: { icon: React.ComponentProps<typeof Feather>['name']; text: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepIcon}>
        <Feather name={icon} size={15} color={theme.colors.primary} />
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

function PasswordStrength({ password }: { password: string }) {
  const strength = getStrength(password);
  const color =
    strength === 'Weak'
      ? theme.colors.danger
      : strength === 'Fair'
        ? theme.colors.warning
        : theme.colors.primary;

  return (
    <View style={styles.strengthRow}>
      <View style={styles.strengthBar}>
        <View
          style={[
            styles.strengthFill,
            {
              width: strength === 'Weak' ? '33%' : strength === 'Fair' ? '66%' : '100%',
              backgroundColor: color,
            },
          ]}
        />
      </View>
      <Text style={[styles.strengthLabel, { color }]}>{strength}</Text>
    </View>
  );
}

function getStrength(password: string): 'Weak' | 'Fair' | 'Strong' {
  if (password.length < 8) return 'Weak';
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const score = [hasUpper, hasLower, hasDigit, hasSymbol].filter(Boolean).length;
  if (score <= 2) return 'Fair';
  return 'Strong';
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  container: {
    padding: 20,
    paddingBottom: 40,
    gap: 18,
  },
  stepsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    gap: 14,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    gap: 12,
  },
  fieldLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: theme.colors.text,
    fontSize: 16,
  },
  inputNoBorder: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    paddingLeft: 14,
  },
  showHideButton: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  showHideText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  passwordHint: {
    color: theme.colors.warning,
    fontSize: 12,
    fontWeight: '600',
    marginTop: -4,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  strengthBar: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 999,
  },
  strengthLabel: {
    width: 50,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
  },
  successCard: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    backgroundColor: theme.colors.successSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(126, 196, 150, 0.22)',
    padding: 16,
  },
  successIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(126, 196, 150, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  successCopy: { flex: 1, gap: 3 },
  successTitle: {
    color: theme.colors.success,
    fontSize: 14,
    fontWeight: '700',
  },
  successFilename: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  successHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  exportingOverlay: {
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  exportingCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    padding: 32,
    alignItems: 'center',
    gap: 16,
  },
  exportingTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  exportingSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  warningCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: theme.colors.warningSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(226, 183, 124, 0.2)',
    padding: 14,
  },
  warningText: {
    flex: 1,
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
