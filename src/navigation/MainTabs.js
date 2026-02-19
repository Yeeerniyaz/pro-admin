/**
 * @file src/navigation/MainTabs.js
 * @description Нижняя панель навигации (Bottom Tabs) для PROADMIN v11.0.0.
 * Связывает Аналитику, Реестр объектов, Кассу, Персонал и Настройки.
 * ДОБАВЛЕНО: 5-я вкладка (Персонал), умное скрытие при открытии клавиатуры, тени (SHADOWS).
 *
 * @module MainTabs
 */

import React from "react";
import { StyleSheet, Platform, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  LayoutDashboard,
  Briefcase,
  DollarSign,
  Sliders,
  Users,
} from "lucide-react-native";

// Импорт нашей дизайн-системы
import { COLORS, SHADOWS, SIZES } from "../theme/theme";

// Подключаем все боевые экраны
import DashboardScreen from "../screens/DashboardScreen";
import OrdersScreen from "../screens/OrdersScreen";
import FinanceScreen from "../screens/FinanceScreen";
import UsersScreen from "../screens/UsersScreen";
import SettingsScreen from "../screens/SettingsScreen";

// Инициализация навигатора
const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // Отключаем стандартные заголовки (у нас свои красивые)
        tabBarHideOnKeyboard: true, // 🔥 Прячем табы, когда открыта клавиатура
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      {/* 1. АНАЛИТИКА */}
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: "Обзор",
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard color={color} size={size} />
          ),
        }}
      />

      {/* 2. ОБЪЕКТЫ */}
      <Tab.Screen
        name="OrdersTab"
        component={OrdersScreen}
        options={{
          tabBarLabel: "Объекты",
          tabBarIcon: ({ color, size }) => (
            <Briefcase color={color} size={size} />
          ),
        }}
      />

      {/* 3. КАССА */}
      <Tab.Screen
        name="FinanceTab"
        component={FinanceScreen}
        options={{
          tabBarLabel: "Касса",
          tabBarIcon: ({ color, size }) => (
            <DollarSign color={color} size={size} />
          ),
        }}
      />

      {/* 4. ПЕРСОНАЛ (Новая вкладка в v11.0) */}
      <Tab.Screen
        name="UsersTab"
        component={UsersScreen}
        options={{
          tabBarLabel: "Люди",
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />

      {/* 5. ПРАЙС / НАСТРОЙКИ */}
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: "Прайс",
          tabBarIcon: ({ color, size }) => (
            <Sliders color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// =============================================================================
// 🎨 ВНУТРЕННИЕ СТИЛИ НАВИГАТОРА
// =============================================================================
const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: Platform.OS === "ios" ? 85 : 65, // Кроссплатформенная высота
    paddingBottom: Platform.OS === "ios" ? 25 : 8,
    paddingTop: 8,
    ...SHADOWS.medium, // Добавляем объем для нижней панели
    position: "absolute", // Делаем панель плавающей
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
});
