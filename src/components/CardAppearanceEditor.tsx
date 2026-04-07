import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import ColorPicker, {
  HueSlider,
  Panel1,
  type ColorFormatsObject,
} from 'reanimated-color-picker';

import type { Card } from '../types';
import {
  CARD_COLOR_PRESETS,
  getBrandDefaultColor,
  normalizeHexColor,
} from '../utils/cardAppearance';
import { CardView } from './CardView';
import { ThemedButton } from './ThemedButton';
import { theme } from '../theme';

interface CardAppearanceEditorProps {
  previewCard: Card;
  themeColor?: string;
  onChange: (appearance: {
    themeColor?: string;
  }) => void;
}

function ModeChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[styles.modeChip, active && styles.modeChipActive]}
    >
      <Feather
        name={icon}
        size={15}
        color={active ? theme.colors.primaryInk : theme.colors.textMuted}
      />
      <Text style={[styles.modeChipText, active && styles.modeChipTextActive]} allowFontScaling={false}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function CustomChip({
  color,
  active,
  onPress,
}: {
  color: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[styles.modeChip, active && styles.modeChipActive]}
    >
      <View style={[styles.customChipDot, { backgroundColor: color }]} />
      <Text style={[styles.modeChipText, active && styles.modeChipTextActive]} allowFontScaling={false}>
        Custom
      </Text>
    </TouchableOpacity>
  );
}

export function CardAppearanceEditor({
  previewCard,
  themeColor,
  onChange,
}: CardAppearanceEditorProps) {
  const [pickerVisible, setPickerVisible] = useState(false);

  const selected = normalizeHexColor(themeColor);
  const usesBrandDefault = !selected;
  const isPresetColor = selected
    ? CARD_COLOR_PRESETS.some((preset) => preset.value === selected)
    : false;
  const customButtonColor =
    selected ??
    getBrandDefaultColor(previewCard.brand);

  // Modal backdrop padding (20) + modal card padding (18) on each side = 76px total
  const modalCardWidth = Dimensions.get('window').width - 76;

  const [draftColor, setDraftColor] = useState(customButtonColor);
  const pickerPreviewCard = useMemo<Card>(
    () => ({
      ...previewCard,
      themeColor: draftColor,
    }),
    [draftColor, previewCard],
  );

  useEffect(() => {
    setDraftColor(customButtonColor);
  }, [customButtonColor]);

  const statusCopy = useMemo(() => {
    if (!selected) return 'Using brand default colors.';
    return `Using custom color ${selected}.`;
  }, [selected]);

  const openCustomPicker = () => {
    setDraftColor(customButtonColor);
    setPickerVisible(true);
  };

  const handlePickerChange = (colors: ColorFormatsObject) => {
    const nextColor = normalizeHexColor(colors.hex);
    if (nextColor) {
      setDraftColor(nextColor);
    }
  };

  const applyCustomColor = () => {
    onChange({ themeColor: draftColor });
    setPickerVisible(false);
  };

  return (
    <>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} allowFontScaling={false}>Card Appearance</Text>
          <Text style={styles.sectionSubtitle} allowFontScaling={false}>
            Match the saved card to what you remember from your wallet.
          </Text>
        </View>

        <View style={styles.previewWrap}>
          <CardView card={previewCard} />
        </View>

        <Text style={styles.statusText} allowFontScaling={false}>{statusCopy}</Text>

        <View style={styles.modeRow}>
          <ModeChip
            label="Default"
            icon="layers"
            active={usesBrandDefault}
            onPress={() => onChange({ themeColor: undefined })}
          />
          <CustomChip
            color={customButtonColor}
            active={!usesBrandDefault && !isPresetColor}
            onPress={openCustomPicker}
          />
        </View>

        <View style={styles.swatchGrid}>
          {CARD_COLOR_PRESETS.map((preset) => {
            const isSelected = selected === preset.value;
            return (
              <TouchableOpacity
                key={preset.value}
                activeOpacity={0.82}
                onPress={() => onChange({ themeColor: preset.value })}
                style={[styles.swatchButton, isSelected && styles.swatchButtonSelected]}
              >
                <View style={[styles.swatchDot, { backgroundColor: preset.value }]} />
                <Text style={styles.swatchLabel} allowFontScaling={false}>{preset.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={pickerVisible}
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderCopy}>
                <Text style={styles.modalTitle} allowFontScaling={false}>Pick Custom Color</Text>
                <Text style={styles.modalSubtitle} allowFontScaling={false}>
                  Choose the closest match for the physical card.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPickerVisible(false)}
                activeOpacity={0.8}
                style={styles.modalCloseButton}
              >
                <Feather name="x" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalPreviewRow}>
                <View style={[styles.modalPreviewSwatch, { backgroundColor: draftColor }]} />
                <Text style={styles.modalPreviewText} allowFontScaling={false}>{draftColor}</Text>
              </View>

              <View style={styles.modalCardPreviewWrap}>
                <CardView card={pickerPreviewCard} width={modalCardWidth} />
              </View>

              <ColorPicker
                value={draftColor}
                onChangeJS={handlePickerChange}
                style={styles.picker}
                thumbSize={28}
                sliderThickness={22}
              >
                <Panel1 style={styles.pickerPanel} />
                <HueSlider style={styles.hueSlider} />
              </ColorPicker>
            </ScrollView>

            <View style={styles.modalActions}>
              <ThemedButton
                title="Cancel"
                variant="ghost"
                onPress={() => setPickerVisible(false)}
                style={styles.modalActionButton}
              />
              <ThemedButton
                title="Done"
                onPress={applyCustomColor}
                style={styles.modalActionButton}
                icon={<Feather name="check" size={16} color={theme.colors.primaryInk} />}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 16,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  previewWrap: {
    alignItems: 'center',
  },
  statusText: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  modeChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  modeChipText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  modeChipTextActive: {
    color: theme.colors.primaryInk,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatchButton: {
    minWidth: '30%',
    flexGrow: 1,
    flexBasis: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  swatchButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  customChipDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  swatchDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  swatchLabel: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    padding: 18,
    gap: 16,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalScrollContent: {
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalPreviewSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  modalPreviewText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  modalCardPreviewWrap: {
    alignItems: 'center',
  },
  picker: {
    gap: 14,
  },
  pickerPanel: {
    height: 220,
    borderRadius: 18,
  },
  hueSlider: {
    borderRadius: 999,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalActionButton: {
    flex: 1,
  },
});
