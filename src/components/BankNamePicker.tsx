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

import { theme } from '../theme';

export const FAMOUS_BANKS: string[] = [
  // Americas
  'Bank of America',
  'BB&T',
  'Bradesco',
  'Capital One',
  'Citibank',
  'Goldman Sachs',
  'Itaú',
  'JPMorgan Chase',
  'RBC',
  'Scotiabank',
  'TD Bank',
  'US Bank',
  'Wells Fargo',
  // Europe
  'Barclays',
  'BBVA',
  'BNP Paribas',
  'Crédit Agricole',
  'Deutsche Bank',
  'ING',
  'Intesa Sanpaolo',
  'Lloyds Bank',
  'NatWest',
  'Nordea',
  'Raiffeisen',
  'Santander',
  'Société Générale',
  'UBS',
  'UniCredit',
  // UK / Global
  'HSBC',
  'Standard Chartered',
  // Asia – China
  'Agricultural Bank of China',
  'Bank of China',
  'China Construction Bank',
  'ICBC',
  // Asia – India
  'Axis Bank',
  'HDFC Bank',
  'ICICI Bank',
  'Kotak Mahindra Bank',
  'State Bank of India',
  // Asia – Japan
  'Mizuho',
  'Mitsubishi UFJ',
  'Sumitomo Mitsui',
  // Asia – SE Asia / Korea
  'DBS Bank',
  'KB Kookmin Bank',
  'Maybank',
  'OCBC',
  'Shinhan Bank',
  // Middle East
  'Al Rajhi Bank',
  'Emirates NBD',
  'First Abu Dhabi Bank',
  'Qatar National Bank',
  // Africa
  'Absa',
  'Standard Bank',
  // Australia / NZ
  'ANZ',
  'Commonwealth Bank',
  'NAB',
  'Westpac',
];

interface BankNamePickerProps {
  value: string;
  onChange: (name: string) => void;
  required?: boolean;
}

export function BankNamePicker({ value, onChange, required }: BankNamePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customView, setCustomView] = useState(false);
  const [draftCustom, setDraftCustom] = useState('');

  const isCustom = value !== '' && !FAMOUS_BANKS.includes(value);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return FAMOUS_BANKS;
    return FAMOUS_BANKS.filter((b) => b.toLowerCase().includes(q));
  }, [search]);

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
    setDraftCustom(isCustom ? value : '');
    setCustomView(true);
  }

  function confirmCustom() {
    const trimmed = draftCustom.trim();
    if (!trimmed) return;
    onChange(trimmed);
    closeModal();
  }

  const displayLabel = value || 'Select or type a bank name';

  return (
    <View style={styles.container}>
      <Text style={styles.label} allowFontScaling={false}>
        Bank Name{required ? <Text style={styles.requiredMark} allowFontScaling={false}> *</Text> : null}
      </Text>

      <TouchableOpacity
        style={styles.selectField}
        onPress={openModal}
        activeOpacity={0.8}
      >
        <Text style={[styles.selectValue, !value && styles.selectPlaceholder]} numberOfLines={1} allowFontScaling={false}>
          {displayLabel}
        </Text>
        <Feather name="chevron-down" size={18} color={theme.colors.textMuted} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.overlay}>
          <View style={styles.modalCard}>

            {customView ? (
              /* ── Custom input screen ── */
              <>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setCustomView(false)} activeOpacity={0.75}>
                    <Feather name="arrow-left" size={18} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle} allowFontScaling={false}>Custom Bank Name</Text>
                  <TouchableOpacity onPress={closeModal} activeOpacity={0.75}>
                    <Feather name="x" size={18} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.customBody}>
                  <TextInput
                    style={styles.customInput}
                    value={draftCustom}
                    onChangeText={setDraftCustom}
                    placeholder="e.g. Punjab National Bank"
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
              /* ── Bank list screen ── */
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle} allowFontScaling={false}>Select Bank</Text>
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
                    placeholder="Search banks…"
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
                    style={[styles.optionRow, isCustom ? styles.optionRowActive : null]}
                    onPress={openCustomView}
                    activeOpacity={0.8}
                  >
                    <Feather
                      name="edit-2"
                      size={14}
                      color={isCustom ? theme.colors.primary : theme.colors.textMuted}
                      style={styles.optionIcon}
                    />
                    <Text style={[styles.optionText, isCustom ? styles.optionTextActive : null]} allowFontScaling={false}>
                      {isCustom ? value : 'Custom'}
                    </Text>
                    {isCustom
                      ? <Feather name="check" size={16} color={theme.colors.primary} />
                      : <Feather name="chevron-right" size={14} color={theme.colors.textMuted} />
                    }
                  </TouchableOpacity>

                  {filtered.map((bank) => {
                    const isActive = bank === value;
                    return (
                      <TouchableOpacity
                        key={bank}
                        style={[styles.optionRow, isActive ? styles.optionRowActive : null]}
                        onPress={() => {
                          onChange(bank);
                          closeModal();
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.optionText, isActive ? styles.optionTextActive : null]} allowFontScaling={false}>
                          {bank}
                        </Text>
                        {isActive ? (
                          <Feather name="check" size={16} color={theme.colors.primary} />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}

                  {filtered.length === 0 ? (
                    <View style={styles.emptyWrap}>
                      <Text style={styles.emptyText} allowFontScaling={false}>No banks found for "{search}"</Text>
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
