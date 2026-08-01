import React from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions, type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { layout, space, stroke, type } from '../theme/tokens';
import {
  SHEET_INSET, SHEET_RADIUS, sheetMaxPx, sheetTabClearance,
} from '../theme/sheet';
import { useOverlayPresence } from './useOverlayPresence';

export { SHEET_MAX_SCREEN_RATIO } from '../theme/sheet';

interface Props {
  visible: boolean;
  onClose: () => void;
  onClosed?: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** @deprecated Sheets always scroll when content exceeds the cap. */
  scroll?: boolean;
  /** @deprecated Ignored — global cap is always 75% of screen from the bottom. */
  maxHeight?: number | `${number}%`;
  footer?: React.ReactNode;
  sheetStyle?: ViewStyle;
  /**
   * When false, children render without an outer ScrollView (nested FlatList).
   * Pass a maxHeight on your list so it can scroll inside the 75% cap.
   */
  bodyScroll?: boolean;
}

/**
 * Unified bottom sheet — content-sized, max 75% screen, parks above tab bar.
 */
export function BottomSheetModal({
  visible, onClose, onClosed, title, subtitle, children,
  footer, sheetStyle, bodyScroll = true,
}: Props) {
  const { theme, animationSpeed } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();

  const sheetBottom = sheetTabClearance(insets.bottom);
  const sheetMaxH = sheetMaxPx(winH, {
    topInset: Math.max(insets.top, 8),
    bottomInset: insets.bottom,
  });

  const headerReserve = (title || subtitle) ? 72 : 0;
  const footerReserve = footer ? 64 : 0;
  const bodyMaxH = Math.max(120, sheetMaxH - headerReserve - footerReserve - layout.sheetPad * 2);

  const {
    present, heavy, closing, clipH, noteShellHeight,
    backdropOpacity, reveal, shellHeight, contentOpacity,
  } = useOverlayPresence({
    visible,
    animationSpeed,
    fallbackHeight: Math.min(220, sheetMaxH),
    onClosed,
  });

  const boxH = Math.min(Math.max(clipH, 1), sheetMaxH);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - reveal.value) * shellHeight.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  if (!present) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.flex} pointerEvents="box-none">
          <Animated.View
            style={[
              s.backdrop,
              { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.55)' : 'rgba(15,23,42,0.4)' },
              backdropStyle,
            ]}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={onClose}
              disabled={closing}
            />
          </Animated.View>

          <View
            style={[
              s.clip,
              { maxHeight: sheetMaxH, marginBottom: sheetBottom },
              // Prefer measured height, but never force a tall empty shell
              clipH > 0 ? { height: boxH } : null,
            ]}
            pointerEvents="box-none"
          >
            {heavy ? (
              <Animated.View
                style={[
                  s.panel,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    maxHeight: sheetMaxH,
                  },
                  sheetStyle,
                  panelStyle,
                ]}
                onLayout={(e) => {
                  if (closing) return;
                  const h = Math.ceil(e.nativeEvent.layout.height);
                  if (h > 0) noteShellHeight(Math.min(h, sheetMaxH));
                }}
              >
                <View style={s.sheetInner}>
                  <Animated.View style={contentStyle}>
                    {(title || subtitle) ? (
                      <View style={s.header}>
                        {title ? (
                          <Text style={[s.title, { color: theme.text }]} numberOfLines={1}>
                            {title}
                          </Text>
                        ) : null}
                        {subtitle ? (
                          <Text style={[s.subtitle, { color: theme.subtext }]}>{subtitle}</Text>
                        ) : null}
                      </View>
                    ) : null}

                    {bodyScroll ? (
                      <ScrollView
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator
                        nestedScrollEnabled
                        bounces
                        style={{ maxHeight: bodyMaxH }}
                        contentContainerStyle={s.scrollContent}
                        scrollEnabled
                        scrollIndicatorInsets={{ right: 2 }}
                      >
                        {children}
                      </ScrollView>
                    ) : (
                      <View style={{ maxHeight: bodyMaxH, overflow: 'hidden' }}>
                        {children}
                      </View>
                    )}
                  </Animated.View>

                  {footer ? <View style={s.footer}>{footer}</View> : null}
                </View>
              </Animated.View>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  clip: {
    marginHorizontal: SHEET_INSET,
    overflow: 'hidden',
    borderRadius: SHEET_RADIUS,
  },
  panel: {
    borderRadius: SHEET_RADIUS,
    borderWidth: stroke.width,
    overflow: 'hidden',
    elevation: 0,
  },
  sheetInner: {
    paddingHorizontal: layout.sheetPad,
    paddingTop: layout.sheetPad,
    paddingBottom: space[3],
  },
  header: {
    marginBottom: space[3],
  },
  title: { ...type.title },
  subtitle: { ...type.meta, marginTop: 4, lineHeight: 17 },
  scrollContent: {
    flexGrow: 0,
    paddingBottom: space[2],
    // Keep values clear of the scrollbar track
    paddingRight: layout.scrollGutter,
  },
  footer: {
    marginTop: space[2],
    paddingTop: space[2],
    flexGrow: 0,
    flexShrink: 0,
  },
});
