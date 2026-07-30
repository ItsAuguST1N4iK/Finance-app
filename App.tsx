import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { runMigrations } from './src/db/migrations';
import { AppNavigator }  from './src/navigation/AppNavigator';
import { usePlannedIncomeStore } from './src/store/plannedIncomeSlice';
import { ThemeProvider }    from './src/theme/ThemeContext';
import { LanguageProvider } from './src/i18n/LanguageContext';
import { repairCurrencyMismatches } from './src/utils/repairCurrency';
import { ensureEssentialCategoryRules } from './src/utils/categoryRules';
import { refreshCustomCategoryCache } from './src/utils/categoryImpact';
import { refreshAccountBalancesFromTransactions } from './src/utils/accountBalance';

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
        const repaired = repairCurrencyMismatches();
        if (repaired.monoCsvFixed || repaired.selfTransferTyped) {
          console.log('[App] data repair:', repaired);
        }
        // One forced recompute during splash — avoids double refresh after first loadAccounts
        refreshAccountBalancesFromTransactions(true);
        checkOverdue();
        setReady(true);
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
    <ThemeProvider>
      <LanguageProvider>
        <SafeAreaProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <AppNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
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
