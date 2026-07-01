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

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { checkOverdue }  = usePlannedIncomeStore();

  useEffect(() => {
    async function init() {
      // #region agent log
      fetch('http://127.0.0.1:7394/ingest/d7074d66-40c3-4a99-aa0d-e056b37ec457',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1ad59a'},body:JSON.stringify({sessionId:'1ad59a',location:'App.tsx:20',message:'init() started — JS is executing',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      try {
        await runMigrations();
        // #region agent log
        fetch('http://127.0.0.1:7394/ingest/d7074d66-40c3-4a99-aa0d-e056b37ec457',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1ad59a'},body:JSON.stringify({sessionId:'1ad59a',location:'App.tsx:23',message:'runMigrations() completed successfully',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        checkOverdue();
        setReady(true);
        // #region agent log
        fetch('http://127.0.0.1:7394/ingest/d7074d66-40c3-4a99-aa0d-e056b37ec457',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1ad59a'},body:JSON.stringify({sessionId:'1ad59a',location:'App.tsx:25',message:'setReady(true) — app fully initialized',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'C,D'})}).catch(()=>{});
        // #endregion
      } catch (e) {
        console.error('[App] init error:', e);
        // #region agent log
        fetch('http://127.0.0.1:7394/ingest/d7074d66-40c3-4a99-aa0d-e056b37ec457',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1ad59a'},body:JSON.stringify({sessionId:'1ad59a',location:'App.tsx:29',message:'init() CAUGHT ERROR',data:{error:String(e),errorMessage:(e as Error)?.message,errorName:(e as Error)?.name},timestamp:Date.now(),runId:'run1',hypothesisId:'C,D,E'})}).catch(()=>{});
        // #endregion
        setError(String(e));
      }
    }
    init();
  }, []);

  if (error) {
    return (
      <View style={styles.errorScreen}>
        <Text style={styles.errorTitle}>Помилка ініціалізації</Text>
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
