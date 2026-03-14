/**
 * add-card.tsx
 *
 * Scan flow:
 *  - Front-only scan.
 *  - OCR extracts card number, expiry, valid-from, name, bank, and card type.
 *  - CVV is never scanned and must be entered manually.
 *
 * Progressive disclosure:
 *  - Core fields always visible: Name, Card Number, Expiry, CVV, Nickname.
 *  - Extra fields (Bank Name, Card Type, Valid From) only shown when populated.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import * as ImagePicker from 'expo-image-picker';

import { addCard } from '../src/storage/database';
import { detectCardThemeColor } from '../src/services/cardAppearanceService';
import { detectCardBrand, isValidExpiry, formatCardNumber } from '../src/utils/cardUtils';
import { parseCardFromOCR } from '../src/utils/ocrParser';
import { AppBackground } from '../src/components/AppBackground';
import { CardAppearanceEditor } from '../src/components/CardAppearanceEditor';
import { CardBrandPicker } from '../src/components/CardBrandPicker';
import { AppModal, ModalConfig } from '../src/components/AppModal';
import { ThemedButton } from '../src/components/ThemedButton';
import { theme } from '../src/theme';
import type { Card, CardBrand, CardThemeColorSource } from '../src/types';

const FIELD_PLACEHOLDER_COLOR = theme.colors.textMuted;

function cardNumberMaxLength(isAmex: boolean) {
  return isAmex ? 17 : 19;
}

export default function AddCardScreen() {
  const router = useRouter();
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef<Camera>(null);

  const [scanning, setScanning] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<CardBrand>('unknown');
  const [customBrandName, setCustomBrandName] = useState('');
  const [brandManuallySet, setBrandManuallySet] = useState(false);
  const [themeColor, setThemeColor] = useState<string | undefined>(undefined);
  const [detectedThemeColor, setDetectedThemeColor] = useState<string | undefined>(undefined);
  const [themeColorSource, setThemeColorSource] = useState<CardThemeColorSource | undefined>(undefined);
  const [hasScannedCard, setHasScannedCard] = useState(false);

  // Core form fields
  const [name, setName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [showCvv, setShowCvv] = useState(false);
  const [nickname, setNickname] = useState('');

  const [bankName, setBankName] = useState('');
  const [cardType, setCardType] = useState('');
  const [validFromMonth, setValidFromMonth] = useState('');
  const [validFromYear, setValidFromYear] = useState('');

  const [saving, setSaving] = useState(false);

  const detectedBrand = detectCardBrand(cardNumber);
  const isAmex = detectedBrand === 'amex';
  const cvvMaxLength = isAmex ? 4 : 3;

  const previewCard = useMemo<Card>(() => {
    const previewBrand = selectedBrand;
    const previewNumber =
      cardNumber || (previewBrand === 'amex' ? '378282246310005' : '4242424242424242');
    const previewExpiryMonth = expiryMonth || '12';
    const previewExpiryYear = expiryYear || '30';
    const previewCvv = cvv || (previewBrand === 'amex' ? '1234' : '123');

    return {
      id: 'preview',
      name: name || 'CARD HOLDER',
      cardNumber: previewNumber,
      expiryMonth: previewExpiryMonth,
      expiryYear: previewExpiryYear,
      cvv: previewCvv,
      nickname,
      brand: previewBrand,
      customBrandName: selectedBrand === 'custom' ? customBrandName.trim() || 'Custom' : undefined,
      bankName: bankName.trim() || undefined,
      validFromMonth: validFromMonth || undefined,
      validFromYear: validFromYear || undefined,
      cardType: cardType.trim() || undefined,
      themeColor,
      detectedThemeColor,
      themeColorSource,
    };
  }, [
    bankName,
    cardNumber,
    cardType,
    customBrandName,
    cvv,
    detectedThemeColor,
    expiryMonth,
    expiryYear,
    name,
    nickname,
    selectedBrand,
    themeColor,
    themeColorSource,
    validFromMonth,
    validFromYear,
  ]);

  useEffect(() => {
    if (!brandManuallySet) {
      setSelectedBrand(detectedBrand);
      setCustomBrandName('');
    }
  }, [detectedBrand, brandManuallySet]);

  const handleBrandChange = useCallback((brand: CardBrand) => {
    setSelectedBrand(brand);
    if (brand !== 'custom') {
      setCustomBrandName('');
    }
    setBrandManuallySet(brand === 'custom' || brand !== detectedBrand);
  }, [detectedBrand]);

  const handleAppearanceChange = useCallback((appearance: {
    themeColor?: string;
    themeColorSource?: CardThemeColorSource;
  }) => {
    setThemeColor(appearance.themeColor);
    setThemeColorSource(appearance.themeColor ? appearance.themeColorSource : undefined);
  }, []);

  // ── OCR ─────────────────────────────────────────────────────────────────────

  const processImage = useCallback(async (fileUri: string) => {
    try {
      const [result, extractedThemeColor] = await Promise.all([
        TextRecognition.recognize(fileUri),
        detectCardThemeColor(fileUri),
      ]);

      const parsed = parseCardFromOCR(result);
      const hasDetectedData = Boolean(
        parsed.cardNumber ||
        parsed.expiryMonth ||
        parsed.cardHolderName ||
        parsed.bankName ||
        parsed.cardType ||
        parsed.validFromMonth,
      );

      if (parsed.cardNumber) setCardNumber(parsed.cardNumber);
      if (parsed.expiryMonth) setExpiryMonth(parsed.expiryMonth);
      if (parsed.expiryYear) setExpiryYear(parsed.expiryYear);
      if (parsed.validFromMonth) setValidFromMonth(parsed.validFromMonth);
      if (parsed.validFromYear) setValidFromYear(parsed.validFromYear);
      if (parsed.cardHolderName) setName(parsed.cardHolderName);
      if (parsed.bankName) setBankName(parsed.bankName);
      if (parsed.cardType) setCardType(parsed.cardType);
      if (hasDetectedData && extractedThemeColor) {
        setDetectedThemeColor(extractedThemeColor);
        if (themeColorSource !== 'manual') {
          setThemeColor(extractedThemeColor);
          setThemeColorSource('detected');
        }
      }

      if (hasDetectedData) {
        setHasScannedCard(true);
        setCameraOpen(false);
      } else {
        setModal({
          title: 'No Card Data Detected',
          message: 'Could not extract card details. Try adjusting the angle or lighting.',
          buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
        });
      }
    } catch (err) {
      console.error('OCR error:', err);
      setModal({
        title: 'OCR Error',
        message: 'Could not read the image.',
        buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
      });
    }
  }, [themeColorSource]);

  const handleCapturePhoto = useCallback(async () => {
    if (!cameraRef.current) return;
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePhoto({ flash: 'off' });
      await processImage(`file://${photo.path}`);
    } catch (err: any) {
      setModal({
        title: 'Scan Error',
        message: err.message ?? 'Could not capture photo.',
        buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
      });
    } finally {
      setScanning(false);
    }
  }, [processImage]);

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;
    setScanning(true);
    try {
      await processImage(result.assets[0].uri);
    } finally {
      setScanning(false);
    }
  }, [processImage]);

  const handleOpenCamera = async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        setModal({
          title: 'Camera Permission Required',
          message: 'Please allow camera access in Settings to scan cards.',
          buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
        });
        return;
      }
    }
    setCameraOpen(true);
  };

  const handleDoneScanning = () => {
    setCameraOpen(false);
  };

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const cleanNumber = cardNumber.replace(/\D/g, '');

    if (!name.trim()) {
      setModal({
        title: 'Validation',
        message: 'Please enter the cardholder name.',
        buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
      });
      return;
    }
    if (cleanNumber.length < 13) {
      setModal({
        title: 'Validation',
        message: 'Please enter a valid card number.',
        buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
      });
      return;
    }
    if (!expiryMonth || !expiryYear) {
      setModal({
        title: 'Validation',
        message: 'Please enter the card expiry date.',
        buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
      });
      return;
    }
    if (!isValidExpiry(expiryMonth, expiryYear)) {
      setModal({
        title: 'Validation',
        message: 'The card appears to be expired.',
        buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
      });
      return;
    }
    if (!cvv.trim()) {
      setModal({
        title: 'Validation',
        message: 'Please enter the CVV.',
        buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
      });
      return;
    }
    if (selectedBrand === 'custom' && !customBrandName.trim()) {
      setModal({
        title: 'Validation',
        message: 'Please enter a custom card brand name.',
        buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
      });
      return;
    }

    setSaving(true);
    try {
      await addCard({
        name: name.trim(),
        cardNumber: cleanNumber,
        expiryMonth: expiryMonth.padStart(2, '0'),
        expiryYear: expiryYear.slice(-2),
        cvv: cvv.trim(),
        nickname: nickname.trim(),
        brand: selectedBrand,
        customBrandName: selectedBrand === 'custom' ? customBrandName.trim() : undefined,
        bankName: bankName.trim() || undefined,
        validFromMonth: validFromMonth || undefined,
        validFromYear: validFromYear || undefined,
        cardType: cardType.trim() || undefined,
        themeColor,
        detectedThemeColor,
        themeColorSource: themeColor ? themeColorSource : undefined,
      });
      router.back();
    } catch (err: any) {
      setModal({
        title: 'Could Not Save',
        message: err.message,
        buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {cameraOpen ? (
        <View style={styles.cameraContainer}>
          {device ? (
            <>
              <Camera
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive
                photo
              />

              {/* Scan frame + hint */}
              <View style={styles.cameraOverlay}>
                <View style={styles.scanFrame} />
                <Text style={styles.scanHint}>Align the front of your card</Text>
              </View>

              {/* Controls: Cancel | Capture | Gallery */}
              <View style={styles.cameraControls}>
                <TouchableOpacity onPress={handleDoneScanning} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.captureBtn}
                  onPress={handleCapturePhoto}
                  disabled={scanning}
                >
                  <View style={styles.captureBtnInner} />
                </TouchableOpacity>

                <TouchableOpacity onPress={handlePickImage} style={styles.galleryBtn} disabled={scanning}>
                  <Text style={styles.galleryBtnText}>Gallery</Text>
                </TouchableOpacity>
              </View>

              {/* Full-screen overlay while OCR processes */}
              {scanning && (
                <View style={styles.scanningOverlay}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.scanningText}>Scanning card…</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.noCameraContainer}>
              <Text style={styles.noCameraText}>No camera available</Text>
              <ThemedButton title="Go Back" onPress={handleDoneScanning} variant="ghost" />
            </View>
          )}
        </View>
      ) : (
        <AppBackground>
          <SafeAreaView style={styles.safe} edges={['bottom']}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.flex}
            >
              <ScrollView
                contentContainerStyle={styles.form}
                keyboardShouldPersistTaps="handled"
              >
                <TouchableOpacity
                  style={styles.scanButton}
                  onPress={handleOpenCamera}
                  activeOpacity={0.84}
                >
                  <Feather name="camera" size={18} color={theme.colors.primaryInk} />
                  <Text style={styles.scanButtonText}>Scan card with camera</Text>
                </TouchableOpacity>

                <Text style={styles.orDivider}>Manual details</Text>

                <CardBrandPicker
                  value={selectedBrand}
                  customBrandName={customBrandName}
                  detectedBrand={cardNumber.replace(/\D/g, '').length > 0 ? detectedBrand : undefined}
                  onChange={handleBrandChange}
                  onChangeCustomBrandName={setCustomBrandName}
                />

                {/* ── Core fields ── */}
                <Field
                  label="Cardholder Name"
                  value={name}
                  onChangeText={setName}
                  placeholder="JOHN SMITH"
                  autoCapitalize="characters"
                />

                <Field
                  label="Card Number"
                  value={formatCardNumber(cardNumber)}
                  onChangeText={(t) => setCardNumber(t.replace(/\D/g, '').slice(0, isAmex ? 15 : 16))}
                  placeholder={isAmex ? '3782 822463 10005' : '4242 4242 4242 4242'}
                  keyboardType="number-pad"
                  maxLength={cardNumberMaxLength(isAmex)}
                />

                <View style={styles.row}>
                  <View style={styles.rowField}>
                    <Field
                      label="Expiry Month"
                      value={expiryMonth}
                      onChangeText={(t) => setExpiryMonth(t.replace(/\D/g, '').slice(0, 2))}
                      placeholder="MM"
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>
                  <View style={styles.rowField}>
                    <Field
                      label="Expiry Year"
                      value={expiryYear}
                      onChangeText={(t) => setExpiryYear(t.replace(/\D/g, '').slice(0, 2))}
                      placeholder="YY"
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>
                </View>

                <Field
                  label={isAmex ? 'CVV (4 digits)' : 'CVV'}
                  value={cvv}
                  onChangeText={(t) => setCvv(t.replace(/\D/g, '').slice(0, cvvMaxLength))}
                  placeholder={isAmex ? '••••' : '•••'}
                  keyboardType="number-pad"
                  maxLength={cvvMaxLength}
                  secureTextEntry={!showCvv}
                  trailingAccessory={
                    <TouchableOpacity
                      style={styles.fieldAccessory}
                      onPress={() => setShowCvv((current) => !current)}
                      activeOpacity={0.75}
                    >
                      <Feather
                        name={showCvv ? 'eye-off' : 'eye'}
                        size={16}
                        color={theme.colors.textMuted}
                      />
                      <Text style={styles.fieldAccessoryText}>{showCvv ? 'Hide' : 'Show'}</Text>
                    </TouchableOpacity>
                  }
                />

                <Field
                  label="Nickname (optional)"
                  value={nickname}
                  onChangeText={setNickname}
                  placeholder="Travel Visa, Work Card…"
                  autoCapitalize="words"
                />

                {/* ── Extra fields ── */}
                <View style={styles.row}>
                  <View style={styles.rowField}>
                    <Field
                      label="Valid From Month"
                      value={validFromMonth}
                      onChangeText={(t) => setValidFromMonth(t.replace(/\D/g, '').slice(0, 2))}
                      placeholder="MM"
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>
                  <View style={styles.rowField}>
                    <Field
                      label="Valid From Year"
                      value={validFromYear}
                      onChangeText={(t) => setValidFromYear(t.replace(/\D/g, '').slice(0, 2))}
                      placeholder="YY"
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>
                </View>

                <Field
                  label="Bank Name"
                  value={bankName}
                  onChangeText={setBankName}
                  placeholder="Chase, Barclays, HDFC…"
                  autoCapitalize="words"
                />

                <Field
                  label="Card Type"
                  value={cardType}
                  onChangeText={setCardType}
                  placeholder="Debit, Credit, Prepaid…"
                  autoCapitalize="words"
                />

                {hasScannedCard ? (
                  <CardAppearanceEditor
                    previewCard={previewCard}
                    themeColor={themeColor}
                    detectedThemeColor={detectedThemeColor}
                    themeColorSource={themeColorSource}
                    onChange={handleAppearanceChange}
                  />
                ) : null}
              </ScrollView>

              <View style={styles.saveFooter}>
                <ThemedButton
                  title="Save Card"
                  onPress={handleSave}
                  loading={saving}
                  icon={
                    <Feather name="check" size={18} color={theme.colors.primaryInk} />
                  }
                />
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </AppBackground>
      )}

      <AppModal config={modal} onDismiss={() => setModal(null)} />
    </>
  );
}

// ── Form field component ──────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'email-address';
  maxLength?: number;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
  trailingAccessory?: React.ReactNode;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  maxLength,
  secureTextEntry,
  autoCapitalize,
  trailingAccessory,
}: FieldProps) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInputWrap}>
        <TextInput
          style={[styles.fieldInput, trailingAccessory ? styles.fieldInputWithAccessory : null]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={FIELD_PLACEHOLDER_COLOR}
          keyboardType={keyboardType}
          maxLength={maxLength}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          spellCheck={false}
        />
        {trailingAccessory}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  flex: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  form: {
    padding: 20,
    paddingBottom: 20,
    gap: 16,
  },
  scanButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  scanButtonText: {
    color: theme.colors.primaryInk,
    fontSize: 15,
    fontWeight: '700',
  },
  orDivider: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  saveFooter: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowField: {
    flex: 1,
  },
  fieldContainer: {
    gap: 6,
  },
  fieldInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fieldLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  fieldInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: theme.colors.text,
    fontSize: 16,
  },
  fieldInputWithAccessory: {
    paddingRight: 8,
  },
  fieldAccessory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 14,
    paddingLeft: 6,
  },
  fieldAccessoryText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  // ── Camera ──
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 320,
    height: 200,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
  },
  scanHint: {
    color: theme.colors.text,
    fontSize: 14,
    marginTop: 16,
    backgroundColor: 'rgba(8,8,8,0.76)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    textAlign: 'center',
  },
  cameraControls: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 32,
  },
  cancelBtn: {
    padding: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  captureBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    borderWidth: 3,
    borderColor: 'rgba(0,0,0,0.16)',
  },
  galleryBtn: {
    padding: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  galleryBtnText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  noCameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  noCameraText: {
    color: theme.colors.textMuted,
    fontSize: 16,
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    zIndex: 30,
  },
  scanningText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
