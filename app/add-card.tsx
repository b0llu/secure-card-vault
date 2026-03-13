/**
 * add-card.tsx
 *
 * Scan flow:
 *  - Camera stays open after each scan so you can scan Front and Back
 *    in a single session. Tap "Done" when finished.
 *  - A ✓ appears on the pill toggle once a side has been scanned.
 *  - Front: card number, expiry, valid-from, name, bank, card type.
 *  - Back: CVV.
 *
 * Progressive disclosure:
 *  - Core fields always visible: Name, Card Number, Expiry, CVV, Nickname.
 *  - Extra fields (Bank Name, Card Type, Valid From) only shown when populated.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Animated,
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
import { detectCardBrand, isValidExpiry, formatCardNumber } from '../src/utils/cardUtils';
import { parseCardFromOCR, parseCVVFromOCR } from '../src/utils/ocrParser';
import { AppBackground } from '../src/components/AppBackground';
import { AppModal, ModalConfig } from '../src/components/AppModal';
import { ThemedButton } from '../src/components/ThemedButton';
import { theme } from '../src/theme';

type ScanSide = 'front' | 'back';

const FIELD_PLACEHOLDER_COLOR = theme.colors.textMuted;
const BG = theme.colors.background;

function cardNumberMaxLength(isAmex: boolean) {
  return isAmex ? 17 : 19;
}

export default function AddCardScreen() {
  const router = useRouter();
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef<Camera>(null);

  const [scanning, setScanning] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const backPillScale = useRef(new Animated.Value(1)).current;
  const flipHintOpacity = useRef(new Animated.Value(0)).current;
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanSide, setScanSide] = useState<ScanSide>('front');
  const [frontScanned, setFrontScanned] = useState(false);
  const [backScanned, setBackScanned] = useState(false);
  const [modal, setModal] = useState<ModalConfig | null>(null);

  // Core form fields
  const [name, setName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [nickname, setNickname] = useState('');

  // Extra fields — only shown when they have values
  const [bankName, setBankName] = useState('');
  const [cardType, setCardType] = useState('');
  const [validFromMonth, setValidFromMonth] = useState('');
  const [validFromYear, setValidFromYear] = useState('');

  const [saving, setSaving] = useState(false);

  const brand = detectCardBrand(cardNumber);
  const isAmex = brand === 'amex';
  const cvvMaxLength = isAmex ? 4 : 3;

  const showBankName = bankName.length > 0;
  const showCardType = cardType.length > 0;
  const showValidFrom = validFromMonth.length > 0 || validFromYear.length > 0;

  // ── OCR ─────────────────────────────────────────────────────────────────────

  const processImage = useCallback(async (fileUri: string, side: ScanSide) => {
    try {
      const result = await TextRecognition.recognize(fileUri);

      console.log('──────────────────────────────────────');
      console.log(`OCR [${side.toUpperCase()}] raw text:`);
      console.log(result.text);
      console.log('──────────────────────────────────────');

      if (side === 'front') {
        const parsed = parseCardFromOCR(result.text);
        console.log('OCR [FRONT] parsed result:', JSON.stringify(parsed, null, 2));

        if (parsed.cardNumber) setCardNumber(parsed.cardNumber);
        if (parsed.expiryMonth) setExpiryMonth(parsed.expiryMonth);
        if (parsed.expiryYear) setExpiryYear(parsed.expiryYear);
        if (parsed.validFromMonth) setValidFromMonth(parsed.validFromMonth);
        if (parsed.validFromYear) setValidFromYear(parsed.validFromYear);
        if (parsed.cardHolderName) setName(parsed.cardHolderName);
        if (parsed.bankName) setBankName(parsed.bankName);
        if (parsed.cardType) setCardType(parsed.cardType);

        setFrontScanned(true);
        setScanSide('back');

        if (!parsed.cardNumber && !parsed.expiryMonth) {
          setModal({
            title: 'No Card Data Detected',
            message: 'Could not extract card details. Try adjusting the angle or lighting.',
            buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
          });
        }
      } else {
        const detected = parseCVVFromOCR(result.text);
        console.log('OCR [BACK] CVV detected:', detected ?? 'none');

        if (detected) {
          setCvv(detected);
          setBackScanned(true);
        } else {
          setModal({
            title: 'CVV Not Found',
            message: 'Could not detect the CVV. Enter it manually.',
            buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
          });
        }
      }
    } catch (err) {
      console.error('OCR error:', err);
      setModal({
        title: 'OCR Error',
        message: 'Could not read the image.',
        buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
      });
    }
  }, []);

  const handleCapturePhoto = useCallback(async () => {
    if (!cameraRef.current) return;
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePhoto({ flash: 'off' });
      await processImage(`file://${photo.path}`, scanSide);
    } catch (err: any) {
      setModal({
        title: 'Scan Error',
        message: err.message ?? 'Could not capture photo.',
        buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }],
      });
    } finally {
      setScanning(false);
    }
  }, [scanSide, processImage]);

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;
    setScanning(true);
    try {
      await processImage(result.assets[0].uri, scanSide);
    } finally {
      setScanning(false);
    }
  }, [scanSide, processImage]);

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
    setFrontScanned(false);
    setBackScanned(false);
    setScanSide('front');
    setCameraOpen(true);
  };

  const handleDoneScanning = () => {
    setCameraOpen(false);
  };

  // Animate Back pill when auto-switching sides
  useEffect(() => {
    if (scanSide === 'back') {
      Animated.sequence([
        Animated.spring(backPillScale, { toValue: 1.22, useNativeDriver: true, speed: 28, bounciness: 14 }),
        Animated.spring(backPillScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }),
      ]).start();

      Animated.sequence([
        Animated.timing(flipHintOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.delay(1400),
        Animated.timing(flipHintOpacity, { toValue: 0, duration: 340, useNativeDriver: true }),
      ]).start();
    }
  }, [scanSide]);

  // Auto-close camera when both sides are scanned
  useEffect(() => {
    if (frontScanned && backScanned) {
      setTransitioning(true);
      const t = setTimeout(() => {
        setCameraOpen(false);
        setTransitioning(false);
      }, 900);
      return () => clearTimeout(t);
    }
  }, [frontScanned, backScanned]);

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

    setSaving(true);
    try {
      await addCard({
        name: name.trim(),
        cardNumber: cleanNumber,
        expiryMonth: expiryMonth.padStart(2, '0'),
        expiryYear: expiryYear.slice(-2),
        cvv: cvv.trim(),
        nickname: nickname.trim(),
        brand: detectCardBrand(cleanNumber),
        bankName: bankName.trim() || undefined,
        validFromMonth: validFromMonth || undefined,
        validFromYear: validFromYear || undefined,
        cardType: cardType.trim() || undefined,
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

              {/* Front / Back toggle */}
              <View style={styles.pillWrapper}>
                <View style={styles.sidePill}>
                  <TouchableOpacity
                    style={[styles.pillBtn, scanSide === 'front' && styles.pillBtnActive]}
                    onPress={() => setScanSide('front')}
                  >
                    <Text style={[styles.pillText, scanSide === 'front' && styles.pillTextActive]}>
                      {frontScanned ? '✓ ' : ''}Front
                    </Text>
                  </TouchableOpacity>
                  <Animated.View style={{ transform: [{ scale: backPillScale }] }}>
                    <TouchableOpacity
                      style={[styles.pillBtn, scanSide === 'back' && styles.pillBtnActive]}
                      onPress={() => setScanSide('back')}
                    >
                      <Text style={[styles.pillText, scanSide === 'back' && styles.pillTextActive]}>
                        {backScanned ? '✓ ' : ''}Back
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>

                <Animated.Text style={[styles.flipHint, { opacity: flipHintOpacity }]}>
                  Flip your card
                </Animated.Text>
              </View>

              {/* Scan frame + hint */}
              <View style={styles.cameraOverlay}>
                <View style={styles.scanFrame} />
                <Text style={styles.scanHint}>
                  {scanSide === 'front' ? 'Align the front of your card' : 'Align the back of your card'}
                </Text>
              </View>

              {/* Controls: Cancel | Capture | Gallery */}
              <View style={styles.cameraControls}>
                <TouchableOpacity onPress={handleDoneScanning} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>
                    {frontScanned || backScanned ? 'Done' : 'Cancel'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.captureBtn}
                  onPress={handleCapturePhoto}
                  disabled={scanning || transitioning}
                >
                  <View style={styles.captureBtnInner} />
                </TouchableOpacity>

                <TouchableOpacity onPress={handlePickImage} style={styles.galleryBtn} disabled={scanning || transitioning}>
                  <Text style={styles.galleryBtnText}>Gallery</Text>
                </TouchableOpacity>
              </View>

              {/* Full-screen overlay while OCR processes or transitioning */}
              {(scanning || transitioning) && (
                <View style={styles.scanningOverlay}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.scanningText}>
                    {transitioning ? 'Preparing card data…' : 'Scanning…'}
                  </Text>
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

                {/* Brand indicator */}
                {cardNumber.replace(/\D/g, '').length > 0 && (
                  <View style={styles.brandRow}>
                    <Text style={styles.brandDetected}>
                      {brand.toUpperCase()}{isAmex ? ' · 4-digit CVV on front' : ''}
                    </Text>
                  </View>
                )}

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
                  secureTextEntry
                />

                <Field
                  label="Nickname (optional)"
                  value={nickname}
                  onChangeText={setNickname}
                  placeholder="Travel Visa, Work Card…"
                  autoCapitalize="words"
                />

                {/* ── Extra fields — only shown when populated ── */}
                {showValidFrom && (
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
                )}

                {showBankName && (
                  <Field
                    label="Bank Name"
                    value={bankName}
                    onChangeText={setBankName}
                    placeholder="HDFC Bank, Chase…"
                    autoCapitalize="words"
                  />
                )}

                {showCardType && (
                  <Field
                    label="Card Type"
                    value={cardType}
                    onChangeText={setCardType}
                    placeholder="Debit, Coral, International Debit…"
                    autoCapitalize="words"
                  />
                )}
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
}: FieldProps) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
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
    </View>
  );
}

const styles = StyleSheet.create({
  screenBg: {
    flex: 1,
    backgroundColor: BG,
  },
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
  brandRow: {
    alignItems: 'flex-start',
    marginBottom: -4,
  },
  brandDetected: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
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
  fieldLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  fieldInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: theme.colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  // ── Camera ──
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  pillWrapper: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 10,
    zIndex: 10,
  },
  sidePill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(8,8,8,0.80)',
    borderRadius: 24,
    padding: 4,
    gap: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  flipHint: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
    backgroundColor: 'rgba(8,8,8,0.72)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillBtn: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 20,
  },
  pillBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  pillText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  pillTextActive: {
    color: theme.colors.primaryInk,
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
