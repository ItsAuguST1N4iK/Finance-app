import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState, type AppStateStatus, View, Text, StyleSheet, ActivityIndicator,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { PressableScale } from './PressableScale';
import {
  loadBiometricEnabled,
  subscribeBiometricEnabled,
} from '../security/biometricPrefs';

/**
 * Locks the app behind device biometrics (fingerprint / Face ID) when enabled.
 * Prompts on cold start and when returning from background.
 */
export function BiometricGate({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [enabled, setEnabled] = useState(false);
  const [unlocked, setUnlocked] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appState = useRef(AppState.currentState);
  const unlockedRef = useRef(true);
  const enabledRef = useRef(false);

  const authenticate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const hw = await LocalAuthentication.hasHardwareAsync();
      if (!hw) {
        // No biometric sensor on this device at all — the lock was never
        // enforceable here, so there is nothing to fail closed against.
        unlockedRef.current = true;
        setUnlocked(true);
        setBusy(false);
        return;
      }

      // Do NOT bypass when biometrics are simply unenrolled (e.g. the user
      // removed their fingerprints in OS settings after enabling app-lock):
      // fail closed and let authenticateAsync attempt the device-passcode
      // fallback, or surface an explicit error otherwise.
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t.biometricPrompt,
        cancelLabel: t.cancel,
        disableDeviceFallback: false,
        fallbackLabel: t.biometricFallback,
      });

      if (result.success) {
        unlockedRef.current = true;
        setUnlocked(true);
      } else {
        unlockedRef.current = false;
        setUnlocked(false);
        setError(t.biometricFailed);
      }
    } catch {
      unlockedRef.current = false;
      setUnlocked(false);
      setError(t.biometricFailed);
    } finally {
      setBusy(false);
    }
  }, [t]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const on = await loadBiometricEnabled();
      if (!alive) return;
      enabledRef.current = on;
      setEnabled(on);
      if (on) {
        unlockedRef.current = false;
        setUnlocked(false);
        await authenticate();
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cold-start only
  }, []);

  useEffect(() => subscribeBiometricEnabled((on) => {
    enabledRef.current = on;
    setEnabled(on);
    if (!on) {
      unlockedRef.current = true;
      setUnlocked(true);
      setError(null);
    } else if (!unlockedRef.current) {
      void authenticate();
    }
  }), [authenticate]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appState.current;
      appState.current = next;
      if (!enabledRef.current) return;
      if (prev.match(/active/) && next.match(/inactive|background/)) {
        unlockedRef.current = false;
        setUnlocked(false);
      }
      if (prev.match(/inactive|background/) && next === 'active' && !unlockedRef.current) {
        void authenticate();
      }
    });
    return () => sub.remove();
  }, [authenticate]);

  if (enabled && !unlocked) {
    return (
      <View style={[styles.lock, { backgroundColor: theme.bg }]}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="finger-print" size={48} color={theme.accent} />
          <Text style={[styles.title, { color: theme.text }]}>{t.biometricTitle}</Text>
          <Text style={[styles.sub, { color: theme.subtext }]}>{t.biometricSubtitle}</Text>
          {error ? <Text style={[styles.err, { color: theme.expense }]}>{error}</Text> : null}
          {busy ? (
            <ActivityIndicator color={theme.accent} style={{ marginTop: 12 }} />
          ) : (
            <PressableScale
              style={[styles.btn, { backgroundColor: theme.accent }]}
              onPress={() => void authenticate()}
              scaleTo={0.96}
            >
              <Ionicons name="finger-print" size={20} color={theme.onAccent} />
              <Text style={[styles.btnText, { color: theme.onAccent }]}>{t.biometricUnlock}</Text>
            </PressableScale>
          )}
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  lock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    gap: 10,
  },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  sub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  err: { fontSize: 13, textAlign: 'center', marginTop: 4 },
  btn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  btnText: { fontSize: 15, fontWeight: '700' },
});
