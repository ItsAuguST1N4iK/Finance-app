import * as SecureStore from 'expo-secure-store';

const KEY = 'show_tab_labels';

type Listener = (show: boolean) => void;
const listeners = new Set<Listener>();

function notify(show: boolean) {
  listeners.forEach((l) => l(show));
}

export function subscribeShowTabLabels(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Default: labels visible. */
export async function loadShowTabLabels(): Promise<boolean> {
  try {
    const v = await SecureStore.getItemAsync(KEY);
    if (v == null) return true;
    return v !== '0';
  } catch {
    return true;
  }
}

export async function saveShowTabLabels(show: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, show ? '1' : '0', {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch {
    // still notify for session
  }
  notify(show);
}
