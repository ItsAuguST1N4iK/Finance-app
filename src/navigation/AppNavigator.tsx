import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { IslandTabBar } from './IslandTabBar';
import { AppScreenHeader } from './AppScreenHeader';
import { AppProgressBar } from './AppProgressBar';
import { View, StyleSheet } from 'react-native';

import { DashboardScreen }    from '../screens/DashboardScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { PlannerScreen }      from '../screens/PlannerScreen';
import { AnalyticsScreen }    from '../screens/AnalyticsScreen';
import { SettingsScreen }     from '../screens/SettingsScreen';

export type RootTabParamList = {
  Dashboard:    undefined;
  Transactions: undefined;
  Planner:      undefined;
  Analytics:    undefined;
  Settings:     undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export function AppNavigator() {
  const { theme } = useTheme();
  const { t }     = useLanguage();

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Tab.Navigator
        tabBar={(props) => <IslandTabBar {...props} />}
        screenOptions={{
          header: ({ options }) => (
            <AppScreenHeader title={typeof options.title === 'string' ? options.title : undefined} />
          ),
          sceneStyle: { backgroundColor: theme.bg },
        }}
      >
        <Tab.Screen name="Dashboard"    component={DashboardScreen}    options={{ title: t.tabDashboard    }} />
        <Tab.Screen name="Transactions" component={TransactionsScreen} options={{ title: t.tabTransactions }} />
        <Tab.Screen name="Planner"      component={PlannerScreen}      options={{ title: t.tabPlanner      }} />
        <Tab.Screen name="Analytics"    component={AnalyticsScreen}    options={{ title: t.tabAnalytics    }} />
        <Tab.Screen name="Settings"     component={SettingsScreen}     options={{ title: t.tabSettings     }} />
      </Tab.Navigator>
      <AppProgressBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
