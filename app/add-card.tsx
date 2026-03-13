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

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
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
import { ThemedButton } from '../src/components/ThemedButton';

type ScanSide = 'front' | 'back';

const FIELD_PLACEHOLDER_COLOR = '#555558';
const BG = '#0E0E0E';

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
  const [scanSide, setScanSide] = useState<ScanSide>('front');
  const [frontScanned, setFrontScanned] = useState(false);
  const [backScanned, setBackScanned] = useState(false);

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

      // ── Dev console: full OCR output ──
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

        if (!parsed.cardNumber && !parsed.expiryMonth) {
          Alert.alert(
            'No card data detected',
            'Could not extract card details. Try adjusting the angle or lighting.',
          );
        }
      } else {
        const detected = parseCVVFromOCR(result.text);

        console.log('OCR [BACK] CVV detected:', detected ?? 'none');

        if (detected) {
          setCvv(detected);
          setBackScanned(true);
        } else {
          Alert.alert('CVV Not Found', 'Could not detect the CVV. Enter it manually.');
        }
      }
    } catch (err) {
      console.error('OCR error:', err);
      Alert.alert('OCR Error', 'Could not read the image.');
    }
  }, []);

  const handleCapturePhoto = useCallback(async () => {
    if (!cameraRef.current) return;
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePhoto({ flash: 'off' });
      await processImage(`file://${photo.path}`, scanSide);
    } catch (err: any) {
      Alert.alert('Scan Error', err.message ?? 'Could not capture photo.');
    } finally {
      setScanning(false);
      // Camera stays open — user taps Done when finished
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
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera access in Settings to scan cards.',
        );
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

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const cleanNumber = cardNumber.replace(/\D/g, '');

    if (!name.trim()) {
      Alert.alert('Validation', 'Please enter the cardholder name.');
      return;
    }
    if (cleanNumber.length < 13) {
      Alert.alert('Validation', 'Please enter a valid card number.');
      return;
    }
    if (!expiryMonth || !expiryYear) {
      Alert.alert('Validation', 'Please enter the card expiry date.');
      return;
    }
    if (!isValidExpiry(expiryMonth, expiryYear)) {
      Alert.alert('Validation', 'The card appears to be expired.');
      return;
    }
    if (!cvv.trim()) {
      Alert.alert('Validation', 'Please enter the CVV.');
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
      Alert.alert('Could Not Save', err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Camera view ──────────────────────────────────────────────────────────────

  if (cameraOpen) {
    return (
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
            <View style={styles.sidePill}>
              <TouchableOpacity
                style={[styles.pillBtn, scanSide === 'front' && styles.pillBtnActive]}
                onPress={() => setScanSide('front')}
              >
                <Text style={[styles.pillText, scanSide === 'front' && styles.pillTextActive]}>
                  {frontScanned ? '✓ ' : ''}Front
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pillBtn, scanSide === 'back' && styles.pillBtnActive]}
                onPress={() => setScanSide('back')}
              >
                <Text style={[styles.pillText, scanSide === 'back' && styles.pillTextActive]}>
                  {backScanned ? '✓ ' : ''}Back
                </Text>
              </TouchableOpacity>
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
                disabled={scanning}
              >
                {scanning ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <View style={styles.captureBtnInner} />
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={handlePickImage} style={styles.galleryBtn}>
                <Text style={styles.galleryBtnText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.noCameraContainer}>
            <Text style={styles.noCameraText}>No camera available</Text>
            <ThemedButton title="Go Back" onPress={handleDoneScanning} variant="ghost" />
          </View>
        )}
      </View>
    );
  }

  // ── Manual form ──────────────────────────────────────────────────────────────

  return (
    // Outer View ensures the dark background is set during navigation transitions
    <View style={styles.screenBg}>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.form}
            keyboardShouldPersistTaps="handled"
          >
            {/* Scan shortcut */}
            <TouchableOpacity style={styles.scanButton} onPress={handleOpenCamera}>
              <Text style={styles.scanButtonText}>📷  Scan Card with Camera</Text>
            </TouchableOpacity>

            <Text style={styles.orDivider}>— or enter manually —</Text>

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
              onChangeText={(t) => setCardNumber(t.replace(/\D/g, ''))}
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

            <ThemedButton
              title="Save Card"
              onPress={handleSave}
              loading={saving}
              style={styles.saveBtn}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
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
  // Dark background on the outermost wrapper prevents white flash during transitions
  screenBg: {
    flex: 1,
    backgroundColor: BG,
  },
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  flex: {
    flex: 1,
    backgroundColor: BG,
  },
  form: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  scanButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  scanButtonText: {
    color: '#00C896',
    fontSize: 15,
    fontWeight: '600',
  },
  orDivider: {
    color: '#555558',
    fontSize: 13,
    textAlign: 'center',
    marginVertical: -4,
  },
  brandRow: {
    alignItems: 'flex-end',
    marginBottom: -8,
  },
  brandDetected: {
    color: '#00C896',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
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
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  fieldInput: {
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  saveBtn: {
    marginTop: 8,
  },
  // ── Camera ──
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  sidePill: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 24,
    padding: 4,
    gap: 2,
    zIndex: 10,
  },
  pillBtn: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 20,
  },
  pillBtnActive: {
    backgroundColor: '#00C896',
  },
  pillText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#000000',
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 320,
    height: 200,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#00C896',
    backgroundColor: 'transparent',
  },
  scanHint: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
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
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00C896',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  captureBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#E0E0E0',
  },
  galleryBtn: {
    padding: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  galleryBtnText: {
    color: '#00C896',
    fontSize: 16,
    fontWeight: '500',
  },
  noCameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  noCameraText: {
    color: '#8E8E93',
    fontSize: 16,
  },
});
