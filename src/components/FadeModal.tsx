import React from 'react';
import { type ViewStyle, type StyleProp } from 'react-native';
import { BottomSheetModal } from './BottomSheetModal';

type Props = {
  visible: boolean;
  onClose: () => void;
  onClosed?: () => void;
  children: React.ReactNode;
  /** @deprecated Sheets share one chrome — ignored. */
  cardStyle?: StyleProp<ViewStyle>;
  /** @deprecated Ignored */
  fadeOnly?: boolean;
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
};

/**
 * Alias of BottomSheetModal — kept so older imports keep working.
 * All popups use the same bottom-sheet motion and 75% cap.
 */
export function FadeModal({
  visible, onClose, onClosed, children, title, subtitle, footer,
}: Props) {
  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      title={title}
      subtitle={subtitle}
      footer={footer}
    >
      {children}
    </BottomSheetModal>
  );
}
