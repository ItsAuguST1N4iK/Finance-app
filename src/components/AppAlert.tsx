import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface AlertButton {
  text:    string;
  style?:  'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface Props {
  visible:  boolean;
  title:    string;
  message?: string;
  buttons:  AlertButton[];
  onDismiss?: () => void;
}

export function AppAlert({ visible, title, message, buttons, onDismiss }: Props) {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>

          {message && (
            <Text style={[styles.message, { color: theme.subtext }]}>{message}</Text>
          )}

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.btnRow}>
            {buttons.map((btn, i) => {
              const color =
                btn.style === 'destructive' ? theme.expense :
                btn.style === 'cancel'      ? theme.subtext :
                theme.accent;

              return (
                <React.Fragment key={i}>
                  {i > 0 && <View style={[styles.btnDivider, { backgroundColor: theme.border }]} />}
                  <TouchableOpacity
                    style={styles.btn}
                    onPress={() => {
                      onDismiss?.();
                      btn.onPress?.();
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.btnText,
                      { color },
                      btn.style === 'cancel' && { fontWeight: '400' },
                    ]}>
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function useAppAlert() {
  const [state, setState] = React.useState<{
    visible:  boolean;
    title:    string;
    message?: string;
    buttons:  AlertButton[];
  }>({ visible: false, title: '', buttons: [] });

  function show(title: string, message?: string, buttons?: AlertButton[]) {
    setState({
      visible: true,
      title,
      message,
      buttons: buttons ?? [{ text: 'OK' }],
    });
  }

  function hide() {
    setState((s) => ({ ...s, visible: false }));
  }

  const element = (
    <AppAlert
      {...state}
      onDismiss={hide}
    />
  );

  return { show, hide, element };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  divider: { height: 1 },
  btnRow:  { flexDirection: 'row' },
  btnDivider: { width: 1 },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
