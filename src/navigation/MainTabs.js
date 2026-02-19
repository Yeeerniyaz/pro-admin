/**
 * @file src/navigation/MainTabs.js
 * @description Главный навигатор приложения (Tabs).
 * UPGRADES (Senior):
 * - Полностью кастомный стиль TabBar (Floating style).
 * - Интеграция всех новых модулей (Finance, Users, Settings).
 * - Отключение стандартных хедеров для использования кастомных.
 * - Оптимизация иконок и цветов.
 *
 * @module MainTabs
 */

import React from "react";
import { View, StyleSheet, Platform, TouchableOpacity } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  LayoutDashboard,
  ListTodo,
  Users,
  Wallet,
  Settings,
} from "lucide-react-native";

// Импорт экранов
import DashboardScreen from "../screens/DashboardScreen";
import OrdersScreen from "../screens/OrdersScreen";
import UsersScreen from "../screens/UsersScreen";
import FinanceScreen from "../screens/FinanceScreen";
import SettingsScreen from "../screens/SettingsScreen";

// Импорт темы
import { COLORS, SIZES, SHADOWS } from "../theme/theme";

const Tab = createBottomTabNavigator();

// Кастомная кнопка таба (для анимаций или особого стиля в будущем)
const TabButton = ({ accessibilityState, children, onPress }) => {
  const isSelected = accessibilityState.selected;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.tabButton, isSelected && styles.tabButtonActive]}
    >
      <View
        style={[styles.iconContainer, isSelected && styles.iconContainerActive]}
      >
        {children}
      </View>
    </TouchableOpacity>
  );
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // Мы используем свои хедеры на экранах
        tabBarShowLabel: true, // Показываем подписи для ясности
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarHideOnKeyboard: true, // Скрывать при вводе текста
      }}
    >
      {/* 1. ГЛАВНАЯ */}
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: "Обзор",
          tabBarIcon: ({ color, size, focused }) => (
            <LayoutDashboard
              color={color}
              size={24}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
          tabBarButton: (props) => <TabButton {...props} />,
        }}
      />

      {/* 2. ЗАКАЗЫ */}
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarLabel: "Объекты",
          tabBarIcon: ({ color, size, focused }) => (
            <ListTodo color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
          ),
          tabBarButton: (props) => <TabButton {...props} />,
        }}
      />

      {/* 3. ФИНАНСЫ (Новый модуль) */}
      <Tab.Screen
        name="Finance"
        component={FinanceScreen}
        options={{
          tabBarLabel: "Касса",
          tabBarIcon: ({ color, size, focused }) => (
            <Wallet color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
          ),
          tabBarButton: (props) => <TabButton {...props} />,
        }}
      />

      {/* 4. ПЕРСОНАЛ (Новый модуль) */}
      <Tab.Screen
        name="Users"
        component={UsersScreen}
        options={{
          tabBarLabel: "Штат",
          tabBarIcon: ({ color, size, focused }) => (
            <Users color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
          ),
          tabBarButton: (props) => <TabButton {...props} />,
        }}
      />

      {/* 5. НАСТРОЙКИ */}
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: "Меню",
          tabBarIcon: ({ color, size, focused }) => (
            <Settings color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
          ),
          tabBarButton: (props) => <TabButton {...props} />,
        }}
      />
    </Tab.Navigator>
  );
}

// =============================================================================
// 🎨 STYLES
// =============================================================================
const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 25 : 15,
    left: 15,
    right: 15,
    height: 65,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderTopWidth: 0, // Убираем стандартную линию
    // Тени для "Floating" эффекта
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    paddingBottom: Platform.OS === "ios" ? 0 : 5, // Корректировка центровки
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 5,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    // Можно добавить стиль контейнера для активного таба
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 5,
    borderRadius: 12,
  },
  iconContainerActive: {
    backgroundColor: COLORS.primary + "10", // Легкая подсветка активной иконки
    transform: [{ scale: 1.1 }], // Легкое увеличение
  },
});
