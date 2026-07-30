import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, Animated,
  KeyboardAvoidingView, Platform, ScrollView, type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { layout, radius, space, type } from '../theme/tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  scroll?: boolean;
  maxHeight?: number | `${number}%`;
  footer?: React.ReactNode;
  sheetStyle?: ViewStyle;
}

export function BottomSheetModal({
  visible, onClose, title, subtitle, children,
  scroll = false, maxHeight = '90%', footer, sheetStyle,
}: Props) {
  const { theme, cardSurface } = useTheme();
  const [mounted, setMounted] = useState(visible);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(sheetTranslateY, { toValue: 0, useNativeDriver: true, friction: 9, tension: 80 }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: 40, duration: 180, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, mounted, backdropOpacity, sheetTranslateY]);

  if (!visible && !mounted) return null;

  const sheetBody = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={{ maxHeight }}
    >
      {children}
    </ScrollView>
  ) : children;

  return (
    <Modal visible={visible || mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.flex}>
          <Animated.View style={[s.backdrop, { opacity: backdropOpacity, backgroundColor: theme.overlay }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
          </Animated.View>

          <Animated.View style={[
            s.sheet,
            cardSurface(),
            { borderColor: theme.border, maxHeight, transform: [{ translateY: sheetTranslateY }] },
            sheetStyle,
          ]}>
            {(title || subtitle) && (
              <View style={s.header}>
                <View style={s.headerText}>
                  {title ? <Text style={[s.title, { color: theme.text }]}>{title}</Text> : null}
                  {subtitle ? <Text style={[s.subtitle, { color: theme.subtext }]}>{subtitle}</Text> : null}
                </View>
                <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.75}>
                  <Ionicons name="close" size={22} color={theme.subtext} />
                </TouchableOpacity>
              </View>
            )}
            {sheetBody}
            {footer}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: 1,
    padding: layout.sheetPad,
    paddingBottom: Platform.OS === 'ios' ? space[6] + 4 : layout.sheetPad,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: space[3],
    gap: space[3],
  },
  headerText: { flex: 1 },
  title: { ...type.title },
  subtitle: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  closeBtn: { padding: space[1] },
});
