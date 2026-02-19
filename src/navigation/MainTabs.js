/**
 * @file src/navigation/MainTabs.js
 * @description Нижняя панель навигации (Bottom Tabs) для PROADMIN.
 * Связывает Аналитику, Реестр объектов, Кассу и Настройки.
 *
 * @module MainTabs
 */

import React from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, Briefcase, DollarSign, Sliders } from 'lucide-react-native';

// Импорт темы
import { COLORS } from '../theme/theme';

// Подключаем готовые экраны
import DashboardScreen from '../screens/DashboardScreen';
import OrdersScreen from '../screens/OrdersScreen';

// 🚧 Заглушка для экранов Кассы и Прайса (создадим их позже)
const PlaceholderScreen = ({ name }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
    <Text style={{ color: COLORS.textMuted, fontSize: 16 }}>Экран «{name}» в разработке...</Text>
  </View>
);

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        }
      }}
    >
      <Tab.Screen 
        name="DashboardTab" 
        component={DashboardScreen} 
        options={{
          tabBarLabel: 'Аналитика',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />
        }}
      />
      <Tab.Screen 
        name="OrdersTab" 
        component={OrdersScreen} 
        options={{
          tabBarLabel: 'Объекты',
          tabBarIcon: ({ color, size }) => <Briefcase color={color} size={size} />
        }}
      />
      <Tab.Screen 
        name="FinanceTab" 
        component={() => <PlaceholderScreen name="Касса" />} 
        options={{
          tabBarLabel: 'Касса',
          tabBarIcon: ({ color, size }) => <DollarSign color={color} size={size} />
        }}
      />
      <Tab.Screen 
        name="SettingsTab" 
        component={() => <PlaceholderScreen name="Настройки" />} 
        options={{
          tabBarLabel: 'Прайс',
          tabBarIcon: ({ color, size }) => <Sliders color={color} size={size} />
        }}
      />
    </Tab.Navigator>
  );
}