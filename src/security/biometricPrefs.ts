import * as SecureStore from 'expo-secure-store';

const KEY = 'biometric_lock_enabled';

type Listener = (enabled: boolean) => void;
const listeners = new Set<Listener>();

export function subscribeBiometricEnabled(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function notify(enabled: boolean) {
  listeners.forEach((l) => l(enabled));
}

export async function loadBiometricEnabled(): Promise<boolean> {
  try {
    const v = await SecureStore.getItemAsync(KEY);
    return v === '1';
  } catch {
    return false;
  }
}

export async function saveBiometricEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(KEY, enabled ? '1' : '0', {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  notify(enabled);
}
