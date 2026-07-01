import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { IslandTabBar } from './IslandTabBar';

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
    <Tab.Navigator
      tabBar={(props) => <IslandTabBar {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.header,
          borderBottomColor: theme.border,
          borderBottomWidth: 1,
        },
        headerTintColor: theme.text,
        headerTitleStyle: { fontWeight: '600' },
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      <Tab.Screen name="Dashboard"    component={DashboardScreen}    options={{ title: t.tabDashboard    }} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} options={{ title: t.tabTransactions }} />
      <Tab.Screen name="Planner"      component={PlannerScreen}      options={{ title: t.tabPlanner      }} />
      <Tab.Screen name="Analytics"    component={AnalyticsScreen}    options={{ title: t.tabAnalytics    }} />
      <Tab.Screen name="Settings"     component={SettingsScreen}     options={{ title: t.tabSettings     }} />
    </Tab.Navigator>
  );
}
