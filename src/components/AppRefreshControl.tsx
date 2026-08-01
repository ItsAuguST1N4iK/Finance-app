import React from 'react';
import { Platform, RefreshControl, type RefreshControlProps } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

type Props = Omit<RefreshControlProps, 'tintColor' | 'colors' | 'progressBackgroundColor'>;

/** Themed pull-to-refresh that matches accent / card surfaces. */
export function AppRefreshControl(props: Props) {
  const { theme } = useTheme();
  return (
    <RefreshControl
      {...props}
      tintColor={theme.accent}
      colors={[theme.accent]}
      progressBackgroundColor={theme.card}
      // Android Material spinner sits on card; iOS uses tint only
      {...(Platform.OS === 'ios'
        ? { titleColor: theme.subtext }
        : null)}
    />
  );
}
