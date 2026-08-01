import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import { layout, radius, space, stroke, type } from './tokens';

/** Uppercase section / group label used across screens. */
export function sectionLabelStyle(color: string, marginBottom: number = space[2.5]): TextStyle {
  return {
    ...type.section,
    color,
    marginBottom,
  };
}

/** Field label above inputs / chip groups inside sheets. */
export function fieldLabelStyle(color: string): TextStyle {
  return {
    ...type.meta,
    fontWeight: '600',
    color,
    marginBottom: space[1] + 2,
  };
}

export function primaryButtonStyle(accent: string, flex?: number): ViewStyle {
  return {
    flex: flex ?? undefined,
    borderRadius: radius.md,
    paddingVertical: space[3] + 1,
    paddingHorizontal: space[4],
    backgroundColor: accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space[2],
  };
}

export function ghostButtonStyle(borderColor: string, flex?: number): ViewStyle {
  return {
    flex: flex ?? undefined,
    borderRadius: radius.md,
    paddingVertical: space[3] + 1,
    paddingHorizontal: space[4],
    borderWidth: stroke.width,
    borderColor,
    alignItems: 'center',
    justifyContent: 'center',
  };
}

/** Text field — same radius/border as chips & sheet buttons. */
export function inputStyle(colors: {
  backgroundColor: string;
  borderColor: string;
  color: string;
}): TextStyle {
  return {
    borderRadius: radius.md,
    borderWidth: stroke.width,
    paddingVertical: space[3],
    paddingHorizontal: space[3],
    fontSize: 15,
    fontWeight: '500',
    backgroundColor: colors.backgroundColor,
    borderColor: colors.borderColor,
    color: colors.color,
  };
}

/**
 * Selectable chip — one highlight language for all modals:
 * idle: cardAlt + border; active: accent tint + accent border + accent text.
 */
export function selectChipStyle(
  theme: { accent: string; border: string; cardAlt: string },
  active: boolean,
): ViewStyle {
  return {
    paddingHorizontal: space[2.5],
    paddingVertical: space[2],
    borderRadius: radius.md,
    borderWidth: stroke.width,
    borderColor: active ? theme.accent : theme.border,
    backgroundColor: active ? theme.accent + '22' : theme.cardAlt,
  };
}

export function selectChipTextStyle(
  theme: { accent: string; subtext: string; text: string },
  active: boolean,
  size: 'sm' | 'md' = 'md',
): TextStyle {
  return {
    color: active ? theme.accent : theme.subtext,
    fontSize: size === 'sm' ? 11 : 12,
    fontWeight: '600',
  };
}

/** Soft colored badge (category / status) — same radius family, tint + border. */
export function softBadgeStyle(color: string): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.md,
    borderWidth: stroke.width,
    borderColor: color,
    backgroundColor: color + '22',
    paddingHorizontal: space[2.5],
    paddingVertical: 5,
  };
}

export const commonStyles = StyleSheet.create({
  screenPad: {
    paddingHorizontal: layout.screenPad,
  },
  sheetFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2.5],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: layout.chipGap,
  },
  formLabel: {
    ...type.meta,
    fontWeight: '600',
    marginBottom: space[1] + 2,
  },
  formInput: {
    borderRadius: radius.md,
    borderWidth: stroke.width,
    paddingVertical: space[3],
    paddingHorizontal: space[3],
    fontSize: 15,
    fontWeight: '500',
    marginBottom: space[3],
  },
  formChip: {
    paddingHorizontal: space[2.5],
    paddingVertical: space[2],
    borderRadius: radius.md,
    borderWidth: stroke.width,
  },
  footerBtnGhost: {
    flex: 1,
    flexShrink: 1,
    borderRadius: radius.md,
    borderWidth: stroke.width,
    paddingVertical: space[3],
    minHeight: 48,
    maxHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Use inside sheetFooterRow (with Cancel). Never width:100% here. */
  footerBtnPrimary: {
    flex: 2,
    flexShrink: 1,
    borderRadius: radius.md,
    paddingVertical: space[3],
    minHeight: 48,
    maxHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Full-width single action (date picker confirm, etc.). */
  footerBtnPrimarySolo: {
    alignSelf: 'stretch',
    width: '100%',
    borderRadius: radius.md,
    paddingVertical: space[3],
    minHeight: 48,
    maxHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  footerBtnTextPrimary: {
    fontSize: 15,
    fontWeight: '700',
  },
});
