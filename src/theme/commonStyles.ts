import { StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { layout, radius, space, type } from './tokens';

/** Uppercase section / group label used across screens. */
export function sectionLabelStyle(color: string, marginBottom: number = space[2.5]): TextStyle {
  return {
    ...type.section,
    color,
    marginBottom,
  };
}

export function primaryButtonStyle(accent: string): ViewStyle {
  return {
    borderRadius: radius.md,
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    backgroundColor: accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space[2],
  };
}

export function ghostButtonStyle(borderColor: string): ViewStyle {
  return {
    borderRadius: radius.md,
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderWidth: 1,
    borderColor,
    alignItems: 'center',
    justifyContent: 'center',
  };
}

export const commonStyles = StyleSheet.create({
  screenPad: {
    paddingHorizontal: layout.screenPad,
  },
  sheetFooterRow: {
    flexDirection: 'row',
    gap: space[2.5],
    marginTop: space[2],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: layout.chipGap,
  },
});
