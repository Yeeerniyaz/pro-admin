/**
 * @file src/navigation/MainTabs.js
 * @description Главная навигация приложения (PROADMIN Mobile v11.0.9 Enterprise).
 * ДОБАВЛЕНО: Role-Based Access Control (RBAC). Изоляция экранов для Бригадиров и Администраторов.
 * ИСПРАВЛЕНО: Динамические названия вкладок в зависимости от роли.
 * НИКАКИХ УДАЛЕНИЙ: Фиксы наложения на системные кнопки Android (Safe Area) сохранены.
 *
 * @module Navigation
 */

import React, { useContext } from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, Briefcase, DollarSign, Sliders, Users } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../theme/theme';
import { AuthContext } from '../context/AuthContext'; // 🔥 Подключаем ядро авторизации

// Импорт экранов
import DashboardScreen from '../screens/DashboardScreen';
import OrdersScreen from '../screens/OrdersScreen';
import FinanceScreen from '../screens/FinanceScreen';
import UsersScreen from '../screens/UsersScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  // Получаем текущего пользователя для динамического роутинга
  const { user } = useContext(AuthContext);

  // Определяем права доступа
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary, // Будет нашим Electric Orange
        tabBarInactiveTintColor: COLORS.textMuted,
      }}
    >
      {/* 📊 ОБЗОР: Доступно всем (Менеджеры увидят свою стату, Админы - глобальную) */}
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Обзор',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />
        }}
      />

      {/* 🛠 ОБЪЕКТЫ: Доступно всем, но название меняется в зависимости от роли */}
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
    // 🔥 Исправлено: увеличен отступ для Android (Safe Area)
    height: Platform.OS === 'ios' ? 88 : 75,
    paddingBottom: Platform.OS === 'ios' ? 30 : 15,
    ...SHADOWS.medium,
  },
});