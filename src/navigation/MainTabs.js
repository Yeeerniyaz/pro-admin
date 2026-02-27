/**
 * @file src/navigation/MainTabs.js
 * @description Главная навигация приложения (PROADMIN Mobile v14.6.1 Enterprise).
 * 🔥 ИСПРАВЛЕНО (v14.6.1): Возвращен useSafeAreaInsets. Теперь меню не перекрывается системной кнопкой "Домой" или жестами.
 * ДОБАВЛЕНО: Role-Based Access Control (RBAC). Изоляция экранов Кассы, Персонала и Настроек от бригадиров.
 * ДОБАВЛЕНО: Интеграция expo-haptics. Легкая тактильная отдача при переключении вкладок.
 * ДОБАВЛЕНО: Динамическое изменение названия вкладки ("Объекты" для Админа, "Биржа" для Мастера).
 * НИКАКИХ УДАЛЕНИЙ: Вся логика роутинга и экраны сохранены на 100%. ПОЛНЫЙ КОД.
 *
 * @module Navigation
 * @version 14.6.1 (Classic Native & Safe Area Fixed)
 */

import React, { useContext } from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // 🔥 Защита от наложения системных кнопок
import * as Haptics from 'expo-haptics'; // Движок тактильной отдачи
import { LayoutDashboard, Briefcase, DollarSign, Sliders, Users } from 'lucide-react-native';

import { COLORS } from '../theme/theme';
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
  
  // 🔥 Читаем отступы операционной системы (кнопка Домой, жесты)
  const insets = useSafeAreaInsets(); 

  // Определяем права доступа (RBAC)
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  // Умный слушатель для добавления тактильной отдачи
  const hapticListener = () => ({
    tabPress: () => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
  });

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        // Классический строгий нативный дизайн
        tabBarStyle: {
          backgroundColor: COLORS.background, // Глубокий черный фон
          borderTopWidth: 1,
          borderTopColor: COLORS.border, // Тонкая граница сверху
          
          // 🔥 ИСПРАВЛЕНИЕ: Динамическая высота. Базовая 60 + размер системной "челки" снизу
          height: 60 + (insets.bottom > 0 ? insets.bottom : 10),
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: COLORS.primary, // Оранжевый для активной вкладки
        tabBarInactiveTintColor: COLORS.textMuted, // Серый для неактивной
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 4,
        },
      }}
    >
      {/* 📊 ОБЗОР: Доступно всем */}
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        listeners={hapticListener}
        options={{
          tabBarLabel: 'Обзор',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size - 2} />
        }}
      />

      {/* 🛠 ОБЪЕКТЫ: Название меняется динамически */}
      <Tab.Screen
        name="OrdersTab"
        component={OrdersScreen}
        listeners={hapticListener}
        options={{
          tabBarLabel: isAdmin ? 'Объекты' : 'Биржа',
          tabBarIcon: ({ color, size }) => <Briefcase color={color} size={size - 2} />
        }}
      />

      {/* 🔐 ЗАКРЫТЫЙ КОНТУР: Доступно только Админам и Владельцу */}
      {isAdmin && (
        <>
          <Tab.Screen
            name="FinanceTab"
            component={FinanceScreen}
            listeners={hapticListener}
            options={{
              tabBarLabel: 'Касса',
              tabBarIcon: ({ color, size }) => <DollarSign color={color} size={size - 2} />
            }}
          />
          <Tab.Screen
            name="UsersTab"
            component={UsersScreen}
            listeners={hapticListener}
            options={{
              tabBarLabel: 'Люди',
              tabBarIcon: ({ color, size }) => <Users color={color} size={size - 2} />
            }}
          />
          <Tab.Screen
            name="SettingsTab"
            component={SettingsScreen}
            listeners={hapticListener}
            options={{
              tabBarLabel: 'Прайс',
              tabBarIcon: ({ color, size }) => <Sliders color={color} size={size - 2} />
            }}
          />
        </>
      )}
    </Tab.Navigator>
  );
}