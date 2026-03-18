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
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '../src/components/AppBackground';
import { AppModal, ModalConfig } from '../src/components/AppModal';
import { ThemedButton } from '../src/components/ThemedButton';
import {
  decryptVaultFile,
  VAULT_FILE_EXTENSION,
} from '../src/services/exportService';
import {
  getCardCount,
  importCards,
  replaceAllCards,
} from '../src/storage/database';
import { theme } from '../src/theme';

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ImportScreen() {
  const router = useRouter();
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [importing, setImporting] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);

  const showModal = (config: ModalConfig) => setModalConfig(config);
  const dismissModal = () => setModalConfig(null);

  // ── File picker ──────────────────────────────────────────────────────────────

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];

      if (
        !asset.name.endsWith(VAULT_FILE_EXTENSION) &&
        !asset.name.endsWith('.json')
      ) {
        showModal({
          title: 'Invalid File',
          message: `Please select a ${VAULT_FILE_EXTENSION} backup file created by this app.`,
          buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
        });
        return;
      }

      setFileUri(asset.uri);
      setFileName(asset.name);
    } catch (err: any) {
      showModal({
        title: 'File Picker Error',
        message: err.message,
        buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
      });
    }
  };

  // ── Import logic ─────────────────────────────────────────────────────────────

  const doImport = async (replace: boolean, cards: Awaited<ReturnType<typeof decryptVaultFile>>) => {
    setImporting(true);
    try {
      const imported = replace
        ? await replaceAllCards(cards)
        : await importCards(cards);
      setPassword('');
      showModal({
        title: 'Import Complete',
        message: `${imported} card(s) imported successfully.`,
        buttons: [{ label: 'Done', onPress: () => router.replace('/home') }],
      });
    } catch (err: any) {
      showModal({
        title: 'Import Failed',
        message: err.message ?? 'Could not import the backup.',
        buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
      });
    } finally {
      setImporting(false);
    }
  };

  const handleImport = async () => {
    if (!fileUri) {
      showModal({
        title: 'No File Selected',
        message: 'Please choose a backup file first.',
        buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
      });
      return;
    }

    if (!password) {
      showModal({
        title: 'Password Required',
        message: 'Please enter the export password.',
        buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
      });
      return;
    }

    setImporting(true);
    let cards: Awaited<ReturnType<typeof decryptVaultFile>>;
    let existingCount: number;

    try {
      cards = await decryptVaultFile(fileUri, password);
      existingCount = await getCardCount();
    } catch (err: any) {
      showModal({
        title: 'Import Failed',
        message: err.message ?? 'Could not decrypt the backup.',
        buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
      });
      setImporting(false);
      return;
    }

    setImporting(false);

    // No existing cards — add directly, no prompt needed
    if (existingCount === 0) {
      await doImport(false, cards);
      return;
    }

    // Cards exist — offer Replace or Add
    showModal({
      title: 'Import Mode',
      message: `This backup has ${cards.length} card(s). You currently have ${existingCount} card(s) saved.`,
      buttons: [
        { label: 'Cancel', variant: 'ghost', onPress: () => {} },
        {
          label: 'Replace All',
          variant: 'danger',
          onPress: () => doImport(true, cards),
        },
        {
          label: 'Add All',
          variant: 'secondary',
          onPress: () => doImport(false, cards),
        },
      ],
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────────

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
              <StepRow icon="file-text" text="Pick your .securevault backup file" />
              <StepRow icon="key" text="Enter the password you used when exporting" />
              <StepRow icon="check-circle" text="Cards are decrypted and restored to your vault" />
            </View>

            <View style={styles.formCard}>
              <Text style={styles.fieldLabel}>Step 1</Text>
              <TouchableOpacity
                style={[styles.filePicker, fileUri ? styles.filePickerSelected : null]}
                onPress={handlePickFile}
                activeOpacity={0.84}
              >
                <View style={styles.fileIconWrap}>
                  <Feather
                    name={fileUri ? 'check' : 'file-text'}
                    size={18}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.fileCopy}>
                  <Text style={styles.fileTitle}>
                    {fileUri ? 'Backup selected' : 'Choose .securevault file'}
                  </Text>
                  <Text style={styles.fileSubtitle} numberOfLines={1}>
                    {fileName || 'Tap to browse for an encrypted backup file.'}
                  </Text>
                </View>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Step 2</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.inputNoBorder]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password used when exporting"
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
            </View>

            <ThemedButton
              title="Decrypt & Import"
              onPress={handleImport}
              loading={importing}
              disabled={!fileUri || !password}
              icon={
                <Feather name="download" size={18} color={theme.colors.primaryInk} />
              }
            />

            <View style={styles.noteCard}>
              <Feather style={{marginTop: 3}} name="shield" size={16} color={theme.colors.primary} />
              <Text style={styles.noteText}>
                Decrypted locally using your password. Nothing leaves your device.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <AppModal config={modalConfig} onDismiss={dismissModal} />

      {importing && (
        <View style={[StyleSheet.absoluteFill, styles.importingOverlay]}>
          <View style={styles.importingCard}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text style={styles.importingTitle}>Importing your vault…</Text>
            <Text style={styles.importingSubtitle}>
              Decrypting and restoring your cards.{'\n'}Please don't close the app.
            </Text>
          </View>
        </View>
      )}
    </AppBackground>
  );
}

// ── StepRow ───────────────────────────────────────────────────────────────────

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

// ── Styles ────────────────────────────────────────────────────────────────────

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
  filePicker: {
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  filePickerSelected: {
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.primarySoft,
  },
  fileIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileCopy: { flex: 1, gap: 2 },
  fileTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  fileSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  input: {
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    color: theme.colors.text,
    fontSize: 16,
  },
  inputNoBorder: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
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
  noteCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  noteText: {
    flex: 1,
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  importingOverlay: {
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  importingCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    padding: 32,
    alignItems: 'center',
    gap: 16,
  },
  importingTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  importingSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});
