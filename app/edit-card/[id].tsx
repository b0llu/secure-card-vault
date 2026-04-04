import React, { useEffect, useMemo, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '../../src/components/AppBackground';
import { CardAppearanceEditor } from '../../src/components/CardAppearanceEditor';
import { CardBrandPicker } from '../../src/components/CardBrandPicker';
import { BankNamePicker } from '../../src/components/BankNamePicker';
import { AppModal, ModalConfig } from '../../src/components/AppModal';
import { ThemedButton } from '../../src/components/ThemedButton';
import { getCardById, updateCard } from '../../src/storage/database';
import { detectCardBrand, formatCardNumber, isValidExpiry } from '../../src/utils/cardUtils';
import { Card, CardBrand } from '../../src/types';
import { theme } from '../../src/theme';

const PLACEHOLDER_COLOR = theme.colors.textMuted;

export default function EditCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<CardBrand>('unknown');
  const [customBrandName, setCustomBrandName] = useState('');
  const [brandManuallySet, setBrandManuallySet] = useState(false);
  const [themeColor, setThemeColor] = useState<string | undefined>(undefined);

  // Form fields
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
    };
  }, [
    bankName,
    cardNumber,
    cardType,
    customBrandName,
    cvv,
    expiryMonth,
    expiryYear,
    name,
    nickname,
    selectedBrand,
    themeColor,
    validFromMonth,
    validFromYear,
  ]);

  useEffect(() => {
    if (!brandManuallySet) {
      setSelectedBrand(detectedBrand);
      setCustomBrandName('');
    }
  }, [detectedBrand, brandManuallySet]);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const card = await getCardById(id);
      if (card) {
        setName(card.name);
        setCardNumber(card.cardNumber);
        setExpiryMonth(card.expiryMonth);
        setExpiryYear(card.expiryYear);
        setCvv(card.cvv);
        setNickname(card.nickname ?? '');
        setBankName(card.bankName ?? '');
        setCardType(card.cardType ?? '');
        setValidFromMonth(card.validFromMonth ?? '');
        setValidFromYear(card.validFromYear ?? '');
        setSelectedBrand(card.brand);
        setCustomBrandName(card.customBrandName ?? '');
        setThemeColor(card.themeColor);
        setBrandManuallySet(
          card.brand === 'custom' ||
          card.brand !== detectCardBrand(card.cardNumber) ||
          Boolean(card.customBrandName?.trim()),
        );
      }
      setLoading(false);
    })();
  }, [id]);

  const handleBrandChange = (brand: CardBrand) => {
    setSelectedBrand(brand);
    if (brand !== 'custom') {
      setCustomBrandName('');
    }
    setBrandManuallySet(brand === 'custom' || brand !== detectedBrand);
  };

  const handleAppearanceChange = (appearance: {
    themeColor?: string;
  }) => {
    setThemeColor(appearance.themeColor);
  };

  const handleSave = async () => {
    if (!id) {
      setModal({ title: 'Error', message: 'Card ID is missing.', buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }] });
      return;
    }
    const cleanNumber = cardNumber.replace(/\D/g, '');

    if (!name.trim()) {
      setModal({ title: 'Validation', message: 'Please enter the cardholder name.', buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }] });
      return;
    }
    if (cleanNumber.length < 13) {
      setModal({ title: 'Validation', message: 'Please enter a valid card number.', buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }] });
      return;
    }
    if (!expiryMonth || !expiryYear) {
      setModal({ title: 'Validation', message: 'Please enter the expiry date.', buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }] });
      return;
    }
    if (!isValidExpiry(expiryMonth, expiryYear)) {
      setModal({ title: 'Validation', message: 'The card appears to be expired.', buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }] });
      return;
    }
    if (!cvv.trim()) {
      setModal({ title: 'Validation', message: 'Please enter the CVV.', buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }] });
      return;
    }
    if (selectedBrand === 'unknown') {
      setModal({ title: 'Validation', message: 'Please select a card brand.', buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }] });
      return;
    }
    if (selectedBrand === 'custom' && !customBrandName.trim()) {
      setModal({ title: 'Validation', message: 'Please enter a custom card brand name.', buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }] });
      return;
    }
    if (!bankName.trim()) {
      setModal({ title: 'Validation', message: 'Please enter the bank name.', buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }] });
      return;
    }

    setSaving(true);
    try {
      await updateCard(id, {
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
      });
      router.back();
    } catch (err: any) {
      setModal({ title: 'Could Not Save', message: err.message, buttons: [{ label: 'OK', variant: 'ghost', onPress: () => {} }] });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppBackground>
        <View style={styles.loader}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      </AppBackground>
    );
  }

  return (
    <>
      <AppBackground>
        <SafeAreaView style={styles.safe} edges={['bottom']}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.flex}
          >
            <ScrollView
              contentContainerStyle={styles.form}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* ── Required fields ── */}
              <Field label="Cardholder Name" value={name} onChangeText={setName} placeholder="JOHN SMITH" autoCapitalize="characters" required />

              <Field
                label="Card Number"
                value={formatCardNumber(cardNumber)}
                onChangeText={(t) => setCardNumber(t.replace(/\D/g, '').slice(0, isAmex ? 15 : 16))}
                placeholder={isAmex ? '3782 822463 10005' : '4242 4242 4242 4242'}
                keyboardType="number-pad"
                maxLength={isAmex ? 17 : 19}
                required
              />

              <View style={styles.row}>
                <View style={styles.rowField}>
                  <Field label="Expiry Month" value={expiryMonth} onChangeText={(t) => setExpiryMonth(t.replace(/\D/g, '').slice(0, 2))} placeholder="MM" keyboardType="number-pad" maxLength={2} required />
                </View>
                <View style={styles.rowField}>
                  <Field label="Expiry Year" value={expiryYear} onChangeText={(t) => setExpiryYear(t.replace(/\D/g, '').slice(0, 2))} placeholder="YY" keyboardType="number-pad" maxLength={2} required />
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
                    <Text style={styles.fieldAccessoryText} allowFontScaling={false}>{showCvv ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                }
                required
              />

              <CardBrandPicker
                value={selectedBrand}
                customBrandName={customBrandName}
                detectedBrand={cardNumber.replace(/\D/g, '').length > 0 ? detectedBrand : undefined}
                onChange={handleBrandChange}
                onChangeCustomBrandName={setCustomBrandName}
                required
              />

              <BankNamePicker value={bankName} onChange={setBankName} required />

              {/* ── Optional fields ── */}
              <Field label="Nickname (optional)" value={nickname} onChangeText={setNickname} placeholder="Travel Visa, Work Card…" autoCapitalize="words" />

              <Field label="Card Type" value={cardType} onChangeText={setCardType} placeholder="Debit, Credit, Prepaid…" autoCapitalize="words" />

              <View style={styles.row}>
                <View style={styles.rowField}>
                  <Field label="Valid From Month" value={validFromMonth} onChangeText={(t) => setValidFromMonth(t.replace(/\D/g, '').slice(0, 2))} placeholder="MM" keyboardType="number-pad" maxLength={2} />
                </View>
                <View style={styles.rowField}>
                  <Field label="Valid From Year" value={validFromYear} onChangeText={(t) => setValidFromYear(t.replace(/\D/g, '').slice(0, 2))} placeholder="YY" keyboardType="number-pad" maxLength={2} />
                </View>
              </View>

              <CardAppearanceEditor
                previewCard={previewCard}
                themeColor={themeColor}
                onChange={handleAppearanceChange}
              />
            </ScrollView>

            <View style={styles.footer}>
              <ThemedButton
                title="Save Changes"
                onPress={handleSave}
                loading={saving}
                icon={<Feather name="check" size={18} color={theme.colors.primaryInk} />}
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </AppBackground>

      <AppModal config={modal} onDismiss={() => setModal(null)} />
    </>
  );
}

// ── Field component ───────────────────────────────────────────────────────────

function Field({
  label, value, onChangeText, placeholder, keyboardType = 'default',
  maxLength, secureTextEntry, autoCapitalize, trailingAccessory,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'email-address';
  maxLength?: number;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
  trailingAccessory?: React.ReactNode;
  required?: boolean;
}) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel} allowFontScaling={false}>{label}</Text>
      <View style={styles.fieldInputWrap}>
        <TextInput
          style={[styles.fieldInput, trailingAccessory ? styles.fieldInputWithAccessory : null]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={PLACEHOLDER_COLOR}
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

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  safe: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1, backgroundColor: 'transparent' },
  form: {
    padding: 10,
    paddingBottom: 20,
    gap: 16,
  },
  row: { flexDirection: 'row', gap: 12 },
  rowField: { flex: 1 },
  fieldContainer: { gap: 6 },
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
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
});
