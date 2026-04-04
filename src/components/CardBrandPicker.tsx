import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import type { CardBrand } from '../types';
import { getBrandDisplayName } from '../utils/cardUtils';
import { theme } from '../theme';

const PRESET_BRANDS: CardBrand[] = [
  'visa',
  'mastercard',
  'amex',
  'discover',
  'unionpay',
  'jcb',
  'rupay',
];

function getBrandLabel(brand: CardBrand): string {
  switch (brand) {
    case 'visa':       return 'Visa';
    case 'mastercard': return 'Mastercard';
    case 'amex':       return 'Amex';
    case 'discover':   return 'Discover';
    case 'unionpay':   return 'UnionPay';
    case 'jcb':        return 'JCB';
    case 'rupay':      return 'RuPay';
    default:           return brand;
  }
}

interface CardBrandPickerProps {
  value: CardBrand;
  customBrandName?: string;
  detectedBrand?: CardBrand;
  onChange: (brand: CardBrand) => void;
  onChangeCustomBrandName: (name: string) => void;
  required?: boolean;
}

export function CardBrandPicker({
  value,
  customBrandName,
  detectedBrand,
  onChange,
  onChangeCustomBrandName,
  required,
}: CardBrandPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customView, setCustomView] = useState(false);
  const [draftCustom, setDraftCustom] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PRESET_BRANDS;
    return PRESET_BRANDS.filter((b) => getBrandLabel(b).toLowerCase().includes(q));
  }, [search]);

  const currentLabel = value === 'unknown' ? '' : getBrandDisplayName(value, customBrandName);

  function openModal() {
    setSearch('');
    setCustomView(false);
    setDraftCustom('');
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setSearch('');
    setCustomView(false);
    setDraftCustom('');
  }

  function openCustomView() {
    setDraftCustom(value === 'custom' ? (customBrandName ?? '') : '');
    setCustomView(true);
  }

  function confirmCustom() {
    const trimmed = draftCustom.trim();
    if (!trimmed) return;
    onChange('custom');
    onChangeCustomBrandName(trimmed);
    closeModal();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label} allowFontScaling={false}>
        Card Brand{required ? <Text style={styles.requiredMark} allowFontScaling={false}> *</Text> : null}
      </Text>

      <TouchableOpacity
        style={styles.selectField}
        onPress={openModal}
        activeOpacity={0.8}
      >
        <Text style={[styles.selectValue, !currentLabel && styles.selectPlaceholder]} allowFontScaling={false}>
          {currentLabel || 'Select or detect a brand'}
        </Text>
        <Feather name="chevron-down" size={18} color={theme.colors.textMuted} />
      </TouchableOpacity>

      {detectedBrand && detectedBrand !== 'unknown' ? (
        <Text style={styles.detected} allowFontScaling={false}>
          Detected: {getBrandLabel(detectedBrand)}

        </Text>
      ) : null}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.overlay}>
          <View style={styles.modalCard}>

            {customView ? (
              /* ── Custom brand input screen ── */
              <>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setCustomView(false)} activeOpacity={0.75}>
                    <Feather name="arrow-left" size={18} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle} allowFontScaling={false}>Custom Brand</Text>
                  <TouchableOpacity onPress={closeModal} activeOpacity={0.75}>
                    <Feather name="x" size={18} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.customBody}>
                  <TextInput
                    style={styles.customInput}
                    value={draftCustom}
                    onChangeText={setDraftCustom}
                    placeholder="e.g. Diners Club, Mir…"
                    placeholderTextColor={theme.colors.textMuted}
                    autoCapitalize="words"
                    autoCorrect={false}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={confirmCustom}
                  />
                  <TouchableOpacity
                    style={[styles.doneButton, !draftCustom.trim() && styles.doneButtonDisabled]}
                    onPress={confirmCustom}
                    activeOpacity={0.8}
                    disabled={!draftCustom.trim()}
                  >
                    <Feather name="check" size={16} color={theme.colors.primaryInk} />
                    <Text style={styles.doneButtonText} allowFontScaling={false}>Done</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* ── Brand list screen ── */
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle} allowFontScaling={false}>Select Card Brand</Text>
                  <TouchableOpacity onPress={closeModal} activeOpacity={0.75}>
                    <Feather name="x" size={18} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.searchWrap}>
                  <Feather name="search" size={15} color={theme.colors.textMuted} style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search brands…"
                    placeholderTextColor={theme.colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    clearButtonMode="while-editing"
                  />
                </View>

                <ScrollView
                  style={styles.optionList}
                  contentContainerStyle={styles.optionListContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {/* Custom option – always first */}
                  <TouchableOpacity
                    style={[styles.optionRow, value === 'custom' ? styles.optionRowActive : null]}
                    onPress={openCustomView}
                    activeOpacity={0.8}
                  >
                    <Feather
                      name="edit-2"
                      size={14}
                      color={value === 'custom' ? theme.colors.primary : theme.colors.textMuted}
                      style={styles.optionIcon}
                    />
                    <Text style={[styles.optionText, value === 'custom' ? styles.optionTextActive : null]} allowFontScaling={false}>
                      {value === 'custom' && customBrandName ? customBrandName : 'Custom'}
                    </Text>
                    {value === 'custom'
                      ? <Feather name="check" size={16} color={theme.colors.primary} />
                      : <Feather name="chevron-right" size={14} color={theme.colors.textMuted} />
                    }
                  </TouchableOpacity>

                  {filtered.map((brand) => {
                    const isActive = brand === value;
                    return (
                      <TouchableOpacity
                        key={brand}
                        style={[styles.optionRow, isActive ? styles.optionRowActive : null]}
                        onPress={() => {
                          onChange(brand);
                          closeModal();
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.optionText, isActive ? styles.optionTextActive : null]} allowFontScaling={false}>
                          {getBrandLabel(brand)}
                        </Text>
                        {isActive ? (
                          <Feather name="check" size={16} color={theme.colors.primary} />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}

                  {filtered.length === 0 ? (
                    <View style={styles.emptyWrap}>
                      <Text style={styles.emptyText} allowFontScaling={false}>No brands found for "{search}"</Text>
                    </View>
                  ) : null}
                </ScrollView>
              </>
            )}

          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  selectValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  selectPlaceholder: {
    color: theme.colors.textMuted,
  },
  requiredMark: {
    color: '#FF4444',
    fontWeight: '700',
  },
  detected: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    minHeight: '55%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginBottom: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: theme.colors.text,
    fontSize: 15,
  },
  optionList: {
    flex: 1,
  },
  optionListContent: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    gap: 8,
  },
  optionRow: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionRowActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  optionIcon: {
    marginRight: 2,
  },
  optionText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  optionTextActive: {
    color: theme.colors.text,
  },
  emptyWrap: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  // ── Custom input screen ──
  customBody: {
    paddingHorizontal: 14,
    paddingBottom: 20,
    gap: 12,
  },
  customInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: theme.colors.text,
    fontSize: 16,
  },
  doneButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  doneButtonDisabled: {
    opacity: 0.4,
  },
  doneButtonText: {
    color: theme.colors.primaryInk,
    fontSize: 15,
    fontWeight: '700',
  },
});
