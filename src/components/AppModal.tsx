import React, { useRef } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { theme } from '../theme';

export type ModalButton = {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  onPress: () => void;
};

export type ModalConfig = {
  title: string;
  message: string;
  buttons: ModalButton[];
};

interface AppModalProps {
  config: ModalConfig | null;
  onDismiss: () => void;
}

export function AppModal({ config, onDismiss }: AppModalProps) {
  // Preserve last config so content stays visible during the fade-out animation
  const lastConfig = useRef(config);
  if (config !== null) lastConfig.current = config;
  const display = config ?? lastConfig.current;

  return (
    <Modal
      visible={config !== null}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title} allowFontScaling={false}>{display?.title}</Text>
          <Text style={styles.message} allowFontScaling={false}>{display?.message}</Text>
          <View style={styles.buttons}>
            {display?.buttons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.btn, btnSurface(btn.variant)]}
                onPress={() => {
                  onDismiss();
                  btn.onPress();
                }}
                activeOpacity={0.78}
              >
                <Text style={[styles.btnText, btnTextColor(btn.variant)]} allowFontScaling={false}>
                  {btn.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function btnSurface(variant: ModalButton['variant'] = 'primary') {
  switch (variant) {
    case 'danger':
      return { backgroundColor: theme.colors.dangerSoft, borderColor: 'rgba(232,112,112,0.28)' };
    case 'ghost':
      return { backgroundColor: 'transparent', borderColor: theme.colors.border };
    case 'secondary':
      return { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.borderStrong };
    default:
      return { backgroundColor: theme.colors.primary, borderColor: 'rgba(255,255,255,0.08)' };
  }
}

function btnTextColor(variant: ModalButton['variant'] = 'primary') {
  switch (variant) {
    case 'danger':    return { color: theme.colors.danger };
    case 'ghost':     return { color: theme.colors.textMuted };
    case 'secondary': return { color: theme.colors.text };
    default:          return { color: theme.colors.primaryInk };
  }
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    padding: 24,
    gap: 8,
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  message: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
  },
  buttons: {
    gap: 10,
    marginTop: 4,
  },
  btn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
