import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { FadeModal } from './FadeModal';
import { PressableScale } from './PressableScale';

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
    <FadeModal visible={visible} onClose={() => onDismiss?.()}>
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
              <PressableScale
                style={styles.btn}
                scaleTo={0.96}
                onPress={() => {
                  onDismiss?.();
                  btn.onPress?.();
                }}
              >
                <Text style={[
                  styles.btnText,
                  { color },
                  btn.style === 'cancel' && { fontWeight: '400' },
                ]}>
                  {btn.text}
                </Text>
              </PressableScale>
            </React.Fragment>
          );
        })}
      </View>
    </FadeModal>
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
  title: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    paddingTop: 4,
    paddingHorizontal: 4,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 4,
  },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: -4 },
  btnRow:  { flexDirection: 'row' },
  btnDivider: { width: StyleSheet.hairlineWidth },
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
