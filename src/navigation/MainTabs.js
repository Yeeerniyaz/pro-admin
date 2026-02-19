/**
 * @file src/navigation/MainTabs.js
 * @description Исправлено наложение на системные кнопки Android.
 */

import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, Briefcase, DollarSign, Sliders, Users } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../theme/theme';

import DashboardScreen from '../screens/DashboardScreen';
import OrdersScreen from '../screens/OrdersScreen';
import FinanceScreen from '../screens/FinanceScreen';
import UsersScreen from '../screens/UsersScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
      }}
    >
      <Tab.Screen name="DashboardTab" component={DashboardScreen} options={{ tabBarLabel: 'Обзор', tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} /> }} />
      <Tab.Screen name="OrdersTab" component={OrdersScreen} options={{ tabBarLabel: 'Объекты', tabBarIcon: ({ color, size }) => <Briefcase color={color} size={size} /> }} />
      <Tab.Screen name="FinanceTab" component={FinanceScreen} options={{ tabBarLabel: 'Касса', tabBarIcon: ({ color, size }) => <DollarSign color={color} size={size} /> }} />
      <Tab.Screen name="UsersTab" component={UsersScreen} options={{ tabBarLabel: 'Люди', tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ tabBarLabel: 'Прайс', tabBarIcon: ({ color, size }) => <Sliders color={color} size={size} /> }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    // 🔥 Исправлено: увеличен отступ для Android (Safe Area)
    height: Platform.OS === 'ios' ? 88 : 75, 
    paddingBottom: Platform.OS === 'ios' ? 30 : 15,
    ...SHADOWS.medium,
  },
});