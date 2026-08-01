import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, InteractionManager,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { runMigrations } from './src/db/migrations';
import { AppNavigator }  from './src/navigation/AppNavigator';
import { usePlannedIncomeStore } from './src/store/plannedIncomeSlice';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { LanguageProvider } from './src/i18n/LanguageContext';
import { BiometricGate } from './src/components/BiometricGate';
import { repairCurrencyMismatches } from './src/utils/repairCurrency';
import { ensureEssentialCategoryRules } from './src/utils/categoryRules';
import { refreshCustomCategoryCache } from './src/utils/categoryImpact';
import { refreshAccountBalancesFromTransactions } from './src/utils/accountBalance';


function ThemedStatusBar() {
  const { themeKey } = useTheme();
  return <StatusBar style={themeKey === 'light' ? 'dark' : 'light'} translucent />;
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { checkOverdue }  = usePlannedIncomeStore();

  useEffect(() => {
    async function init() {
      try {
        await runMigrations();
        ensureEssentialCategoryRules();
        refreshCustomCategoryCache();
        // Show UI ASAP — heavy repair/balance work runs after first paint
        setReady(true);
        InteractionManager.runAfterInteractions(() => {
          try {
            const repaired = repairCurrencyMismatches();
            if (repaired.monoCsvFixed || repaired.selfTransferTyped) {
              console.log('[App] data repair:', repaired);
            }
            refreshAccountBalancesFromTransactions(true);
            checkOverdue();
          } catch (e) {
            console.warn('[App] deferred init:', e);
          }
        });
      } catch (e) {
        console.error('[App] init error:', e);
        setError(String(e));
      }
    }
    init();
  }, []);

  if (error) {
    return (
      <View style={styles.errorScreen}>
        <Text style={styles.errorTitle}>Init error / Помилка ініціалізації</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Finance Control</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider>
        <LanguageProvider>
          <SafeAreaProvider>
            <NavigationContainer>
              <ThemedStatusBar />
              <BiometricGate>
                <AppNavigator />
              </BiometricGate>
            </NavigationContainer>
          </SafeAreaProvider>
        </LanguageProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '600',
  },
  errorScreen: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorTitle: {
    color: '#ef4444',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  errorText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
});
