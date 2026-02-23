/**
 * @file src/navigation/MainTabs.js
 * @description Главная навигация приложения (PROADMIN Mobile v12.13.0 Enterprise).
 * 🔥 ДОБАВЛЕНО (v12.13.0): Динамический расчет высоты TabBar через useSafeAreaInsets.
 * Теперь меню выглядит идеально на любых экранах (iPhone с челкой, Android с жестами).
 * ДОБАВЛЕНО: Role-Based Access Control (RBAC). Изоляция экранов для Бригадиров и Администраторов.
 * НИКАКИХ УДАЛЕНИЙ: Вся логика роутинга сохранена на 100%. ПОЛНЫЙ КОД.
 *
 * @module Navigation
 */

import React, { useContext } from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // 🔥 Динамические отступы
import { LayoutDashboard, Briefcase, DollarSign, Sliders, Users } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../theme/theme';
import { AuthContext } from '../context/AuthContext'; 

// Импорт экранов
import DashboardScreen from '../screens/DashboardScreen';
import OrdersScreen from '../screens/OrdersScreen';
import FinanceScreen from '../screens/FinanceScreen';
import UsersScreen from '../screens/UsersScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets(); // 🔥 Получаем безопасные зоны устройства

  // Определяем права доступа
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        // 🔥 Динамические стили для TabBar (зависит от модели телефона)
        tabBarStyle: [
          styles.tabBar,
          {
            height: 60 + insets.bottom, 
            paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          }
        ],
        tabBarActiveTintColor: COLORS.primary, 
        tabBarInactiveTintColor: COLORS.textMuted,
      }}
    >
      {/* 📊 ОБЗОР: Доступно всем */}
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Обзор',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />
        }}
      />

      {/* 🛠 ОБЪЕКТЫ: Название меняется динамически */}
      <Tab.Screen
        name="OrdersTab"
        component={OrdersScreen}
        options={{
          tabBarLabel: isAdmin ? 'Объекты' : 'Мои объекты',
          tabBarIcon: ({ color, size }) => <Briefcase color={color} size={size} />
        }}
      />

      {/* 🔐 ЗАКРЫТЫЙ КОНТУР: Доступно только Админам и Владельцу */}
      {isAdmin && (
        <>
          <Tab.Screen
            name="FinanceTab"
            component={FinanceScreen}
            options={{
              tabBarLabel: 'Касса',
              tabBarIcon: ({ color, size }) => <DollarSign color={color} size={size} />
            }}
          />
          <Tab.Screen
            name="UsersTab"
            component={UsersScreen}
            options={{
              tabBarLabel: 'Люди',
              tabBarIcon: ({ color, size }) => <Users color={color} size={size} />
            }}
          />
          <Tab.Screen
            name="SettingsTab"
            component={SettingsScreen}
            options={{
              tabBarLabel: 'Прайс',
              tabBarIcon: ({ color, size }) => <Sliders color={color} size={size} />
            }}
          />
        </>
      )}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    ...SHADOWS.medium,
  },
});