import * as SecureStore from 'expo-secure-store';

/**
 * Обгортка над expo-secure-store для зберігання API-токенів.
 *
 * WHEN_UNLOCKED_THIS_DEVICE_ONLY означає:
 * - токен доступний тільки коли пристрій розблоковано
 * - токен прив'язаний до конкретного пристрою (не переноситься при бекапі)
 * - на Android: зберігається в EncryptedSharedPreferences (Android Keystore)
 * - на iOS: зберігається в Keychain з kSecAttrAccessibleWhenUnlocked
 */
export const tokenStore = {
  set: (key: string, value: string): Promise<void> =>
    SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),

  get: (key: string): Promise<string | null> =>
    SecureStore.getItemAsync(key),

  delete: (key: string): Promise<void> =>
    SecureStore.deleteItemAsync(key),
};

/**
 * Ключі для зберігання токенів.
 * Використовуй їх замість сирих рядків щоб уникнути опечаток.
 */
export const TOKEN_KEYS = {
  monobank:       'token_monobank',
  ibkrFlexToken:  'token_ibkr_flex',
  ibkrQueryId:    'token_ibkr_query_id',
  saltEdgeAppId:  'token_salt_edge_app_id',
  saltEdgeSecret: 'token_salt_edge_secret',
} as const;

export type TokenKey = keyof typeof TOKEN_KEYS;
